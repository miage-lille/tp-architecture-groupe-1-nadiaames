import { InMemoryMailer } from 'src/core/adapters/in-memory-mailer';
import { InMemoryParticipationRepository } from 'src/webinars/adapters/participation-repository.in-memory';
import { InMemoryWebinarRepository } from 'src/webinars/adapters/webinar-repository.in-memory';
import { InMemoryUserRepository } from 'src/users/adapters/user-repository.in-memory';
import { BookSeat } from 'src/webinars/use-cases/book-seat';
import { Webinar } from 'src/webinars/entities/webinar.entity';
import { User } from 'src/users/entities/user.entity';
import { Participation } from 'src/webinars/entities/participation.entity';
import { WebinarNotFoundException } from 'src/webinars/exceptions/webinar-not-found';
import { WebinarNotEnoughSeatsException } from 'src/webinars/exceptions/webinar-not-enough-seats';
import { UserAlreadyParticipatingException } from 'src/webinars/exceptions/user-already-participating';

describe('Feature: Book a seat', () => {
  let participationRepository: InMemoryParticipationRepository;
  let userRepository: InMemoryUserRepository;
  let webinarRepository: InMemoryWebinarRepository;
  let mailer: InMemoryMailer;
  let useCase: BookSeat;

  const webinar = new Webinar({
    id: 'webinar-1',
    organizerId: 'organizer-1',
    title: 'My Webinar',
    startDate: new Date('2024-01-10T10:00:00.000Z'),
    endDate: new Date('2024-01-10T11:00:00.000Z'),
    seats: 10,
  });

  const user = new User({
    id: 'user-1',
    email: 'user@example.com',
    password: 'password123',
  });

  const organizer = new User({
    id: 'organizer-1',
    email: 'organizer@example.com',
    password: 'password123',
  });

  beforeEach(() => {
    webinarRepository = new InMemoryWebinarRepository([webinar]);
    userRepository = new InMemoryUserRepository([user, organizer]);
    participationRepository = new InMemoryParticipationRepository();
    mailer = new InMemoryMailer();
    useCase = new BookSeat(
      participationRepository,
      userRepository,
      webinarRepository,
      mailer,
    );
  });

  describe('Scenario: Happy path', () => {
    it('should book a seat for the user', async () => {
      webinarRepository.database = [webinar];
      userRepository.users = [user, organizer];

      await useCase.execute({ webinarId: 'webinar-1', user });

      const participations =
        await participationRepository.findByWebinarId('webinar-1');
      expect(participations.length).toBe(1);
      expect(participations[0].props.userId).toBe('user-1');
      expect(mailer.sentEmails.length).toBe(1);
    });
  });

  describe('Scenario: Webinar not found', () => {
    it('should throw an error', async () => {
      await expect(
        useCase.execute({ webinarId: 'non-existent-webinar', user }),
      ).rejects.toThrow(WebinarNotFoundException);
    });
  });

  describe('Scenario: Not enough seats', () => {
    it('should throw an error', async () => {
      webinarRepository.database = [webinar];
      userRepository.users = [user];
      participationRepository.database = Array(10).fill(
        new Participation({ userId: 'user-2', webinarId: 'webinar-1' }),
      );

      await expect(
        useCase.execute({ webinarId: 'webinar-1', user }),
      ).rejects.toThrow(WebinarNotEnoughSeatsException);
    });
  });

  describe('Scenario: User already participating', () => {
    it('should throw an error', async () => {
      webinarRepository.database = [webinar];
      userRepository.users = [user];
      participationRepository.database = [
        new Participation({ userId: 'user-1', webinarId: 'webinar-1' }),
      ];

      await expect(
        useCase.execute({ webinarId: 'webinar-1', user }),
      ).rejects.toThrow(UserAlreadyParticipatingException);
    });
  });
});
