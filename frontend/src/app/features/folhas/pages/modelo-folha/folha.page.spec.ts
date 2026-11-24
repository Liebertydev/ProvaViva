import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FolhaPage } from './folha.page';

describe('FolhaPage', () => {
  let component: FolhaPage;
  let fixture: ComponentFixture<FolhaPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(FolhaPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
