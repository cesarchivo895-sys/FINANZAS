export const validators = {
  required: (value, fieldName = 'Este campo') => {
    if (!value || (typeof value === 'string' && !value.trim())) {
      return `${fieldName} es requerido`;
    }
    return null;
  },

  email: (email) => {
    if (!email) return 'Email es requerido';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return 'Email inválido';
    return null;
  },

  password: (password) => {
    if (!password) return 'Contraseña es requerida';
    if (password.length < 6) return 'Mínimo 6 caracteres';
    return null;
  },

  confirmPassword: (password, confirmPassword) => {
    if (password !== confirmPassword) return 'Las contraseñas no coinciden';
    return null;
  },

  amount: (value, fieldName = 'Monto') => {
    if (!value) return `${fieldName} es requerido`;
    const num = parseFloat(value);
    if (isNaN(num) || num <= 0) return `${fieldName} debe ser mayor a 0`;
    return null;
  },

  date: (date) => {
    if (!date) return 'Fecha es requerida';
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) return 'Formato inválido (YYYY-MM-DD)';
    const parsed = new Date(date);
    if (isNaN(parsed.getTime())) return 'Fecha inválida';
    return null;
  },

  minLength: (value, min, fieldName = 'Este campo') => {
    if (!value || value.length < min) return `${fieldName} debe tener al menos ${min} caracteres`;
    return null;
  },
};

export function validateForm(fields, validations) {
  const errors = {};
  for (const [field, fieldValidations] of Object.entries(validations)) {
    for (const validation of fieldValidations) {
      const error = validation(fields[field], field, fields);
      if (error) {
        errors[field] = error;
        break;
      }
    }
  }
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
