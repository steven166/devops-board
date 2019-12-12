import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-build-status',
  templateUrl: './build-status.component.html',
  styleUrls: ['./build-status.component.scss']
})
export class BuildStatusComponent implements OnInit {

  @Input()
  status: string;

  constructor() {
  }

  ngOnInit() {
  }

  getIcon(status: string): string {
    if (status === 'Succeed') {
      return 'check_circle_outline';
    } else if (status === 'Failed') {
      return 'error';
    } else if (status === 'Pending') {
      return 'query_builder';
    } else if (status === 'Progress') {
      return 'autorenew';
    }
    return 'block';
  }

  shoudSpin(status: string): boolean {
    return status === 'Pending' || status === 'Progress';
  }

  getTooltip(status: string): string {
    if (status === 'Succeed') {
      return 'Build Succeed';
    } else if (status === 'Failed') {
      return 'Build Failed';
    } else if (status === 'Pending') {
      return 'Build is Pending';
    } else if (status === 'Progress') {
      return 'Build is in Progress';
    }
    return 'Build doesn\'t exists';
  }

}
