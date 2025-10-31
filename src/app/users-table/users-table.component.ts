import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../api.service';

interface User {
  first_name: string;
  last_name: string;
  email: string;
  date_of_birth: string;
}

type SortColumn = keyof User;
type SortDirection = 'asc' | 'desc';

@Component({
  selector: 'app-users-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './users-table.component.html',
  styleUrls: ['./users-table.component.css']
})
export class UsersTableComponent implements OnInit {
  
  users: User[] = [];
  filteredUsers: User[] = [];
  paginatedUsers: User[] = [];
  
  // Configuración de ordenamiento
  sortColumn: SortColumn = 'first_name';
  sortDirection: SortDirection = 'asc';
  
  // Configuración de paginación
  currentPage: number = 1;
  pageSize: number = 10;
  totalPages: number = 0;
  
  // Estado de carga
  isLoading: boolean = false;
  error: string | null = null;

  constructor(private apiService: ApiService) {}

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.isLoading = true;
    this.error = null;
    
    this.apiService.getUsers().subscribe({
      next: (data) => {
        this.users = data;
        this.filteredUsers = [...data];
        this.applySort();
        this.calculatePagination();
        this.updatePaginatedUsers();
        this.isLoading = false;
      },
      error: (err) => {
        this.error = 'Error al cargar usuarios';
        console.error(err);
        this.isLoading = false;
      }
    });
  }

  // Ordenamiento
  sortBy(column: SortColumn) {
    if (this.sortColumn === column) {
      // Cambiar dirección si ya está ordenado por esta columna
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      // Nueva columna, ordenar ascendente
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    
    this.applySort();
    this.currentPage = 1; // Volver a la primera página
    this.updatePaginatedUsers();
  }

  applySort() {
    this.filteredUsers.sort((a, b) => {
      const aValue = a[this.sortColumn];
      const bValue = b[this.sortColumn];
      
      let comparison = 0;
      if (aValue > bValue) {
        comparison = 1;
      } else if (aValue < bValue) {
        comparison = -1;
      }
      
      return this.sortDirection === 'asc' ? comparison : -comparison;
    });
  }

  // Paginación
  calculatePagination() {
    this.totalPages = Math.ceil(this.filteredUsers.length / this.pageSize);
  }

  updatePaginatedUsers() {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedUsers = this.filteredUsers.slice(startIndex, endIndex);
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePaginatedUsers();
    }
  }

  previousPage() {
    this.goToPage(this.currentPage - 1);
  }

  nextPage() {
    this.goToPage(this.currentPage + 1);
  }

  changePageSize(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.pageSize = parseInt(select.value, 10);
    this.currentPage = 1;
    this.calculatePagination();
    this.updatePaginatedUsers();
  }

  // Helper para mostrar ícono de ordenamiento
  getSortIcon(column: SortColumn): string {
    if (this.sortColumn !== column) {
      return '⇅'; // Sin ordenar
    }
    return this.sortDirection === 'asc' ? '↑' : '↓';
  }

  // Helper para páginas visibles
  getVisiblePages(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    
    if (this.totalPages <= maxVisible) {
      // Mostrar todas las páginas
      for (let i = 1; i <= this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Mostrar rango alrededor de la página actual
      let start = Math.max(1, this.currentPage - 2);
      let end = Math.min(this.totalPages, start + maxVisible - 1);
      
      if (end - start < maxVisible - 1) {
        start = Math.max(1, end - maxVisible + 1);
      }
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }
    
    return pages;
  }

  // Helper para información de registros
  getRecordInfo(): string {
    const start = (this.currentPage - 1) * this.pageSize + 1;
    const end = Math.min(this.currentPage * this.pageSize, this.filteredUsers.length);
    return `Mostrando ${start}-${end} de ${this.filteredUsers.length} usuarios`;
  }
}
