import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../api.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-persons',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './persons.component.html',
})
export class PersonsComponent implements OnInit {
  
  persons$!: Observable<any[]>;

  constructor(private apiService: ApiService) {}

  ngOnInit() {
    this.loadPersons();
  }


  loadPersons() {
        this.persons$ = this.apiService.getPersons();
  }


}
