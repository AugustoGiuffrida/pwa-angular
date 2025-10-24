import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  
  // URL base de tu mock
  private baseUrl = 'https://www.mockachino.com/e76d4e5b-ccbc-40';

  constructor(private http: HttpClient) { }

  getUsers(): Observable<any[]> {
    return this.http.get<any>(`${this.baseUrl}/users`).pipe(
      map(response => {
        // Si la respuesta es un objeto con una propiedad que contiene el array
        if (response && typeof response === 'object' && !Array.isArray(response)) {
          // Intenta encontrar el array en las propiedades del objeto
          const keys = Object.keys(response);
          for (const key of keys) {
            if (Array.isArray(response[key])) {
              return response[key];
            }
          }
          // Si no hay array, devuelve un array vacío
          return [];
        }
        // Si ya es un array, devuélvelo directamente
        return Array.isArray(response) ? response : [];
      })
    );
  }

  getPersons(): Observable<any[]> {
    return this.http.get<any>(`${this.baseUrl}/persons`).pipe(
      map(response => {
        if (response && typeof response === 'object' && !Array.isArray(response)) {
          const keys = Object.keys(response);
          for (const key of keys) {
            if (Array.isArray(response[key])) {
              return response[key];
            }
          }
          return [];
        }
        return Array.isArray(response) ? response : [];
      })
    );
  }

  getContacts(): Observable<any[]> {
    return this.http.get<any>(`${this.baseUrl}/contacts`).pipe(
      map(response => {
        if (response && typeof response === 'object' && !Array.isArray(response)) {
          const keys = Object.keys(response);
          for (const key of keys) {
            if (Array.isArray(response[key])) {
              return response[key];
            }
          }
          return [];
        }
        return Array.isArray(response) ? response : [];
      })
    );
  }
}
