import { User } from '../entities/user.entity';
import { IUserRepository } from '../ports/user-repository.interface';

export class InMemoryUserRepository implements IUserRepository {
  constructor(public users: User[] = []) {}

  async findById(id: string): Promise<User | null> {
    const user = this.users.find((u) => u.props.id === id);
    return user || null;
  }
}
