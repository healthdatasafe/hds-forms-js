export interface FieldProps {
  label: string;
  description?: string;
  value: any;
  onChange: (value: any) => void;
  required?: boolean;
  disabled?: boolean;
}
