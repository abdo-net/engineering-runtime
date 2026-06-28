// @entity User
// @table users
@Entity('users')
export class User {
  @Column() id: number;
  @Column() email: string;
  @Column() status: string;
}
