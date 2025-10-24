import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../api.service';
import { Observable, EMPTY } from 'rxjs';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule], // Importa CommonModule para *ngFor y el pipe 'async'
  templateUrl: './users.component.html',
})
export class UsersComponent {
  
  // Usamos un observable para manejar los datos
  users$!: Observable<any[]>;

  constructor(private apiService: ApiService) {
    this.users$ = EMPTY; // Inicializa como vacío
  }

  loadUsers() {
    this.users$ = this.apiService.getUsers();
  }
}
