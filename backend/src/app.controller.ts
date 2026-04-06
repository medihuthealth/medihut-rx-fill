import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getRoot() {
    return { status: 'ok', message: 'RxFill API is running' };
  }
}
