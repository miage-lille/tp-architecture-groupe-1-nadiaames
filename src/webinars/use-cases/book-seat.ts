import { IMailer } from 'src/core/ports/mailer.interface';
import { Executable } from 'src/shared/executable';
import { User } from 'src/users/entities/user.entity';
import { IUserRepository } from 'src/users/ports/user-repository.interface';
import { IParticipationRepository } from 'src/webinars/ports/participation-repository.interface';
import { IWebinarRepository } from 'src/webinars/ports/webinar-repository.interface';
import { WebinarNotFoundException } from 'src/webinars/exceptions/webinar-not-found';
import { WebinarNotEnoughSeatsException } from 'src/webinars/exceptions/webinar-not-enough-seats';
import { UserAlreadyParticipatingException } from 'src/webinars/exceptions/user-already-participating';
import { Participation } from '../entities/participation.entity';

type Request = {
  webinarId: string;
  user: User;
};
type Response = void;

export class BookSeat implements Executable<Request, Response> {
  constructor(
    private readonly participationRepository: IParticipationRepository,
    private readonly userRepository: IUserRepository,
    private readonly webinarRepository: IWebinarRepository,
    private readonly mailer: IMailer,
  ) {}

  async execute({ webinarId, user }: Request): Promise<Response> {
    // verf si le webinaire existe
    const webinar = await this.webinarRepository.findById(webinarId);
    if (!webinar) {
      throw new WebinarNotFoundException();
    }

    // verf si reste ds places dispo
    const participations =
      await this.participationRepository.findByWebinarId(webinarId);
    if (participations.length >= webinar.props.seats) {
      throw new WebinarNotEnoughSeatsException();
    }

    // verf si user déjà inscrit
    const isUserParticipating = participations.some(
      (p) => p.props.userId === user.props.id,
    );
    if (isUserParticipating) {
      throw new UserAlreadyParticipatingException();
    }

    await this.participationRepository.save(
      new Participation({
        userId: user.props.id,
        webinarId,
      }),
    );

    // envy un email à l'organisateur
    const organizer = await this.userRepository.findById(
      webinar.props.organizerId,
    );
    if (organizer) {
      await this.mailer.send({
        to: organizer.props.email,
        subject: 'New registration for your webinar',
        body: `A new user has registered for your webinar "${webinar.props.title}".`,
      });
    }
  }
}
