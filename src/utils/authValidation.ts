// Shared validation utilities for auth forms

export type PasswordRule = {
  label: string;
  test: (password: string) => boolean;
};

export const passwordRules: PasswordRule[] = [
  {
    label: '8 to 30 characters',
    test: (pwd) => pwd.length >= 8 && pwd.length <= 30,
  },
  {
    label: 'At least 1 uppercase letter',
    test: (pwd) => /[A-Z]/.test(pwd),
  },
  {
    label: 'At least 1 lowercase letter',
    test: (pwd) => /[a-z]/.test(pwd),
  },
  {
    label: 'At least 1 number',
    test: (pwd) => /\d/.test(pwd),
  },
  {
    label: 'At least 1 special character (! @ # $ % ^ & * ( ) _ + -)',
    test: (pwd) => /[!@#$%^&*()_+\-]/.test(pwd),
  },
];

// Validate name (alphabets and spaces only)
export const validateName = (name: string): string => {
  const trimmed = name.trim();
  if (!trimmed) {
    return 'Name is required';
  }
  if (!/^[A-Za-z\s]+$/.test(trimmed)) {
    return 'Name can contain only alphabets and spaces';
  }
  return '';
};

// Validate email
export const validateEmail = (email: string): string => {
  const trimmed = email.trim();
  if (!trimmed) {
    return 'Email is required';
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return 'Please enter a valid email address';
  }
  return '';
};

// Validate password and return failed rules
export const validatePassword = (password: string): string[] => {
  const failed: string[] = [];
  passwordRules.forEach((rule) => {
    if (!rule.test(password)) {
      failed.push(rule.label);
    }
  });
  return failed;
};

