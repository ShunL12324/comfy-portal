import { TemplateType } from '@/types/preset';
import { DefaultApiCallTemplate } from './default-template';
import { Flux1DApiCallTemplate } from './flux-1d-template';

export class ApiCallTemplateFactory {
  private static instance: ApiCallTemplateFactory;
  private templates: Map<TemplateType, any>;

  private constructor() {
    this.templates = new Map();
    this.templates.set('default', new DefaultApiCallTemplate());
    this.templates.set('flux_1d', new Flux1DApiCallTemplate());
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