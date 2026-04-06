import { AiProvider, AiMedicineData } from '../common/types';
export declare class AiService {
    private readonly logger;
    validateKey(provider: AiProvider, apiKey: string, model: string): Promise<{
        valid: boolean;
        message: string;
    }>;
    callProvider(provider: AiProvider, apiKey: string, model: string, medicineList: string): Promise<AiMedicineData[]>;
    private validateClaude;
    private callClaude;
    private validateOpenAI;
    private callOpenAI;
    private validateGemini;
    private callGemini;
    private parseAiResponse;
}
