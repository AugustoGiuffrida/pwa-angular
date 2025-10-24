import { Routes } from '@angular/router';
import { UsersComponent } from './users/users.component';
import { PersonsComponent } from './persons/persons.component';
import { ContactsComponent } from './contacts/contacts.component';

export const routes: Routes = [
  { path: 'users', component: UsersComponent },
  { path: 'persons', component: PersonsComponent },
  { path: 'contacts', component: ContactsComponent },
  { path: '', redirectTo: 'users', pathMatch: 'full' } // Redirige a /users por defecto
];
