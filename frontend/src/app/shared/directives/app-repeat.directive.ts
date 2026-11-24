import { Directive, Input, TemplateRef, ViewContainerRef } from '@angular/core';

interface AppRepeatContext<T> {
  $implicit: T;
  index: number;
  count: number;
  first: boolean;
  last: boolean;
}

@Directive({ selector: '[appRepeat]', standalone: true })
export class AppRepeatDirective<T> {
  constructor(
    private readonly template: TemplateRef<AppRepeatContext<T>>,
    private readonly viewContainer: ViewContainerRef,
  ) {}

  @Input()
  set appRepeatOf(items: readonly T[] | null | undefined) {
    const lista = items ?? [];
    this.viewContainer.clear();

    lista.forEach((item, index) => {
      this.viewContainer.createEmbeddedView(this.template, {
        $implicit: item,
        index,
        count: lista.length,
        first: index === 0,
        last: index === lista.length - 1,
      });
    });
  }

  static ngTemplateContextGuard<T>(
    _diretiva: AppRepeatDirective<T>,
    _contexto: unknown,
  ): _contexto is AppRepeatContext<T> {
    return true;
  }
}
