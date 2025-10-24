import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../api.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-contacts',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './contacts.component.html',
})
export class ContactsComponent implements OnInit {
  
  contacts$!: Observable<any[]>;

  constructor(private apiService: ApiService) {}

  ngOnInit() {
    // Carga automática (cache performance)
    this.loadContacts();
  }

  // Carga manual desde botón si se desea
  loadContacts() {
    this.contacts$ = this.apiService.getContacts();
  }
}
