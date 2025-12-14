/**
 * AppModule - 根模块
 */
import { Module } from '../mini-nest';
import { CatsModule } from './cats/cats.module';

@Module({
  imports: [CatsModule],
})
export class AppModule {}
