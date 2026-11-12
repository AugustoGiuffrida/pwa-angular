export interface Task {
  // UUID generado por la app, para poder crear tareas sin conexión
  id: string;
  title: string;
  completed: boolean;
}
