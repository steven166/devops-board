import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { Releases.RouteComponent } from './releases.route.component';

describe('Releases.RouteComponent', () => {
  let component: Releases.RouteComponent;
  let fixture: ComponentFixture<Releases.RouteComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ Releases.RouteComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(Releases.RouteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
