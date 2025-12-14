/**
 * AppModule - 应用根模块
 *
 * 作为应用的入口模块，导入其他功能模块
 *
 * 模块树结构：
 * AppModule
 *   └── CatsModule
 *         ├── CatsController
 *         └── CatsService
 */
import { Module } from '../mini-nest';
import { CatsModule } from './cats/cats.module';

@Module({
  // 导入子模块
  // 导入后，CatsModule 中的控制器会被注册
  // 如果 CatsModule 导出了某些服务，这里也可以使用
  imports: [CatsModule],
})
export class AppModule {}
