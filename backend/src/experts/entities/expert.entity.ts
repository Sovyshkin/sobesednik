import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, BeforeInsert } from 'typeorm';

@Entity('experts')
export class Expert {
  @PrimaryColumn()
  id!: string;

  @Column({ unique: true })
  login!: string;

  @Column()
  password!: string;

  @Column()
  name!: string;

  @Column()
  age!: number;

  @Column({ type: 'varchar', length: 10, nullable: true })
  gender!: 'male' | 'female' | null;

  @Column({ default: 'Свободен' })
  availability!: string; // Изменили с status на availability

  @Column('text', { nullable: true })
  about?: string;

  @Column('text', { nullable: true })
  allowedTopics?: string;

  @Column('text', { nullable: true })
  forbiddenTopics?: string;

  @Column('decimal', { precision: 10, scale: 2 })
  price!: number;

  @Column({ nullable: true })
  mainPhotoUrl?: string;

  @Column('text', { default: '[]' })
  galleryUrls!: string;

  // @Column({ default: 0 })
  // rating!: number;

  @Column({ default: 0 })
  totalSessions!: number;

  @Column({ nullable: true })
  telegram?: string;

  @Column({ nullable: true })
  otherMessengers?: string;

  @Column({ default: false })
  adultTopics!: boolean;

  @Column({ default: false })
  noForbiddenTopics!: boolean;

  @Column({ default: false })
  adminVerified!: boolean;

  @Column({ type: 'varchar', default: 'draft' })
  status!: 'draft' | 'pending' | 'active' | 'expired' | 'rejected' | 'blocked'; // Оставили для статуса публикации

  @Column({ nullable: true })
  paymentCode?: string;

  @Column({ type: 'int', nullable: true })
  publicationDays?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  paymentAmount?: number;

  @Column({ type: 'datetime', nullable: true })
  publishedAt?: Date;

  @Column({ type: 'datetime', nullable: true })
  expiresAt?: Date;

  @Column({ type: 'datetime', nullable: true })
  expiredAt?: Date; // Дата попадания в статус "Истекшие"
  
  @Column({ default: false })
  alwaysAvailable!: boolean;

  @Column({ default: false })
  expertIsVerified!: boolean; // Новое поле для верификации 

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  rating!: number;

  @Column({ default: 0 })
  ratingCount!: number; // Количество оценок

  @Column('text', { default: '[]' })
  ratings!: string; // Массив всех оценок в формате JSON

  @Column({ type: 'text', nullable: true })
  reviews?: string; // Храним отзывы как JSON строку

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @BeforeInsert()
  generateId() {
    const min = 1000000000;
    const max = 9999999999;
    this.id = Math.floor(min + Math.random() * (max - min)).toString();
  }

  @Column({ nullable: true }) // Добавлено поле для сброса пароля
resetCode: string | null;

@Column({ nullable: true })
telegramChatId: string;    // Добавлено поле для хранения chat ID телеграм пользователя


}