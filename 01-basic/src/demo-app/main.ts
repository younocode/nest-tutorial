/**
 * 应用入口文件
 *
 * 演示如何启动 MiniNest 应用
 */
import 'reflect-metadata';
import { MiniNestFactory } from '../mini-nest';
import { AppModule } from './app.module';

async function bootstrap() {
  console.log('');
  console.log('┌────────────────────────────────────────┐');
  console.log('│  MiniNest 教学项目 - 基础版            │');
  console.log('│  理解 NestJS 核心原理                  │');
  console.log('└────────────────────────────────────────┘');

  // 创建应用实例
  // 这会触发：模块扫描 -> 依赖注入 -> 路由注册
  const app = await MiniNestFactory.create(AppModule);

  // 启动 HTTP 服务器
  await app.listen(3000);

  console.log('');
  console.log('可以尝试以下 API：');
  console.log('');
  console.log('  GET    http://localhost:3000/cats');
  console.log('         获取所有猫咪');
  console.log('');
  console.log('  GET    http://localhost:3000/cats/1');
  console.log('         获取 ID=1 的猫咪');
  console.log('');
  console.log('  GET    http://localhost:3000/cats/search?breed=波斯');
  console.log('         按品种搜索');
  console.log('');
  console.log('  POST   http://localhost:3000/cats');
  console.log('         Body: {"name":"Kitty","age":1,"breed":"暹罗猫"}');
  console.log('         创建新猫咪');
  console.log('');
  console.log('  DELETE http://localhost:3000/cats/1');
  console.log('         删除 ID=1 的猫咪');
  console.log('');
}

// 启动应用
bootstrap().catch(err => {
  console.error('启动失败:', err);
  process.exit(1);
});
