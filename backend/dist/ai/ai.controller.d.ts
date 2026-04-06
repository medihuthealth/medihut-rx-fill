import { AiService } from './ai.service';
import { ValidateKeyDto } from '../common/dto';
export declare class AiController {
    private readonly aiService;
    constructor(aiService: AiService);
    validateKey(dto: ValidateKeyDto): Promise<{
        valid: boolean;
        message: string;
    }>;
}
