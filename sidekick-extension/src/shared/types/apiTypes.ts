export interface ApiRes<T> {
  success: boolean;
  message: string;
  data?: T;
}