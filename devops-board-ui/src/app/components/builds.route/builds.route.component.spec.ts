import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { Builds.RouteComponent } from './builds.route.component';

describe('Builds.RouteComponent', () => {
  let component: Builds.RouteComponent;
  let fixture: ComponentFixture<Builds.RouteComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ Builds.RouteComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(Builds.RouteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
