import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Register = () => {
  const { register } = useContext(AuthContext);
  const navigate = useNavigate();

  // form fields
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'SalesExecutive'
  });

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // liive password policy checks
  const passwordCriteria = {
    hasMinLength: formData.password.length >= 8,
    hasUpperCase: /[A-Z]/.test(formData.password),
    hasLowerCase: /[a-z]/.test(formData.password),
    hasNumber: /[0-9]/.test(formData.password)
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (serverError) {
      setServerError('');
    }
  };

  // client side validaition
  const validateForm = () => {
    const newErrors = {};

    // 1. name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Full name is required.';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters long.';
    }

    // 2. email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required.';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        newErrors.email = 'Enter a valid email address.';
      }
    }

    // 3. phone validation (10 digit)
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required.';
    } else {
      const phoneRegex = /^[6-9]\d{9}$/;
      if (!phoneRegex.test(formData.phone.trim())) {
        newErrors.phone = 'Enter a valid 10-digit Indian mobile number (starts with 6-9).';
      }
    }

    // 4. password policy validation
    const { hasMinLength, hasUpperCase, hasLowerCase, hasNumber } = passwordCriteria;
    if (!formData.password) {
      newErrors.password = 'Password is required.';
    } else if (!hasMinLength || !hasUpperCase || !hasLowerCase || !hasNumber) {
      newErrors.password =
        'Password does not satisfy all policy criteria shown below.';
    }

    // 5. confirm password
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Confirm your password.';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setServerError('');

    try {
      await register({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        role: formData.role
      });
      navigate('/dashboard');
    } catch (err) {
      const errorMsg =
        err.response?.data?.message || 'Registration failed. Please try again.';
      setServerError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ maxWidth: '480px' }}>
        <div className="auth-header">
          <div className="auth-logo">
            Acxiom<span>CRM</span>
          </div>
          <p className="auth-subtitle">Create your new employee account</p>
        </div>

        {serverError && (
          <div className="alert alert-danger">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. John Doe"
              className={`form-control ${errors.name ? 'is-invalid' : ''}`}
            />
            {errors.name && <span className="invalid-feedback">{errors.name}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="e.g. john@acxiom.com"
              className={`form-control ${errors.email ? 'is-invalid' : ''}`}
            />
            {errors.email && <span className="invalid-feedback">{errors.email}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Phone Number (10 Digits)</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="e.g. 9876543210"
              maxLength={10}
              className={`form-control ${errors.phone ? 'is-invalid' : ''}`}
            />
            {errors.phone && <span className="invalid-feedback">{errors.phone}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Role</label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="form-control"
            >
              <option value="SalesExecutive">Sales Executive</option>
              <option value="Manager">Manager</option>
              <option value="Admin">Admin</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Create strong password"
              className={`form-control ${errors.password ? 'is-invalid' : ''}`}
            />
            {errors.password && <span className="invalid-feedback">{errors.password}</span>}

            {/* Live Password Policy Helper Box */}
            <div className="password-policy-box">
              <div className="password-policy-title">Password must contain:</div>
              <div
                className={`policy-item ${
                  passwordCriteria.hasMinLength ? 'valid' : 'invalid'
                }`}
              >
                {passwordCriteria.hasMinLength ? '✓' : '✗'} At least 8 characters
              </div>
              <div
                className={`policy-item ${
                  passwordCriteria.hasUpperCase ? 'valid' : 'invalid'
                }`}
              >
                {passwordCriteria.hasUpperCase ? '✓' : '✗'} At least one uppercase letter (A-Z)
              </div>
              <div
                className={`policy-item ${
                  passwordCriteria.hasLowerCase ? 'valid' : 'invalid'
                }`}
              >
                {passwordCriteria.hasLowerCase ? '✓' : '✗'} At least one lowercase letter (a-z)
              </div>
              <div
                className={`policy-item ${
                  passwordCriteria.hasNumber ? 'valid' : 'invalid'
                }`}
              >
                {passwordCriteria.hasNumber ? '✓' : '✗'} At least one number (0-9)
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Repeat your password"
              className={`form-control ${errors.confirmPassword ? 'is-invalid' : ''}`}
            />
            {errors.confirmPassword && (
              <span className="invalid-feedback">{errors.confirmPassword}</span>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '8px' }}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Registering...' : 'Create Account'}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account?{' '}
          <Link to="/login">Sign in here</Link>
        </div>
      </div>
    </div>
  );
};

export default Register;

