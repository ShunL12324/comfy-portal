import { TemplateType } from '@/types/preset';
import { FluxDevUnetApiCallTemplate } from './flux-dev-unet-template';
import { SD15SDXLApiCallTemplate } from './sd15sdxl-template';

export class ApiCallTemplateFactory {
  private static instance: ApiCallTemplateFactory;
  private templates: Map<TemplateType, any>;

  private constructor() {
    this.templates = new Map();
    this.templates.set('sd_15_sdxl', new SD15SDXLApiCallTemplate());
    this.templates.set('flux_dev_all_in_one', new FluxDevUnetApiCallTemplate());
    this.templates.set('flux_dev_unet', new FluxDevUnetApiCallTemplate());
  }

  public static getInstance(): ApiCallTemplateFactory {
    if (!ApiCallTemplateFactory.instance) {
      ApiCallTemplateFactory.instance = new ApiCallTemplateFactory();
    }
    return ApiCallTemplateFactory.instance;
  }

  public getTemplate(type: TemplateType) {
    const template = this.templates.get(type);
    if (!template) {
      throw new Error(`Template type ${type} not found`);
    }
    return template;
  }

  public registerTemplate(type: TemplateType, template: any) {
    this.templates.set(type, template);
  }
} 