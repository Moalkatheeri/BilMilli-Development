import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../context/AuthContext';

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Password strength checker
const getPasswordStrength = (password) => {
  let strength = 0;
  if (password.length >= 8) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[a-z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^A-Za-z0-9]/.test(password)) strength++;
  return strength;
};

const getPasswordStrengthLabel = (strength) => {
  if (strength === 0) return { label: '', color: '#8B9EB0' };
  if (strength <= 2) return { label: 'Weak', color: '#ef4444' };
  if (strength <= 3) return { label: 'Fair', color: '#f59e0b' };
  if (strength <= 4) return { label: 'Good', color: '#3b82f6' };
  return { label: 'Strong', color: '#22c55e' };
};

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const { login, register, isLoading } = useAuth();

  const validateEmail = (value) => {
    if (!value) {
      setEmailError('Email is required');
      return false;
    }
    if (!EMAIL_REGEX.test(value)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    setEmailError('');
    return true;
  };

  const validatePassword = (value) => {
    if (!value) {
      setPasswordError('Password is required');
      return false;
    }
    if (!isLogin && value.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return false;
    }
    if (!isLogin && getPasswordStrength(value) < 3) {
      setPasswordError('Password must include uppercase, lowercase, and numbers');
      return false;
    }
    setPasswordError('');
    return true;
  };

  const handleSubmit = async () => {
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);

    if (!isEmailValid || !isPasswordValid) {
      return;
    }

    if (isLogin) {
      await login(email, password);
    } else {
      await register({ email, password });
    }
  };

  const passwordStrength = getPasswordStrength(password);
  const strengthIndicator = getPasswordStrengthLabel(passwordStrength);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.logoContainer}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>BG</Text>
          </View>
          <Text style={styles.title}>BuildGuard Pro</Text>
          <Text style={styles.subtitle}>Protect Your Investment</Text>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>
            {isLogin ? 'Sign In' : 'Create Account'}
          </Text>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={[styles.input, emailError ? styles.inputError : null]}
              placeholder="your@email.com"
              placeholderTextColor="#8B9EB0"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (emailError) validateEmail(text);
              }}
              onBlur={() => validateEmail(email)}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
            {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Password</Text>
            <TextInput
              style={[styles.input, passwordError ? styles.inputError : null]}
              placeholder="••••••••"
              placeholderTextColor="#8B9EB0"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (passwordError) validatePassword(text);
              }}
              onBlur={() => validatePassword(password)}
              secureTextEntry
              autoComplete={isLogin ? "password" : "new-password"}
            />
            {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
            
            {/* Password strength indicator for registration */}
            {!isLogin && password.length > 0 && (
              <View style={styles.strengthContainer}>
                <View style={styles.strengthBar}>
                  {[1, 2, 3, 4, 5].map((level) => (
                    <View
                      key={level}
                      style={[
                        styles.strengthSegment,
                        {
                          backgroundColor:
                            level <= passwordStrength
                              ? strengthIndicator.color
                              : '#1E3A5F',
                        },
                      ]}
                    />
                  ))}
                </View>
                <Text style={[styles.strengthText, { color: strengthIndicator.color }]}>
                  {strengthIndicator.label}
                </Text>
              </View>
            )}
            
            {!isLogin && (
              <Text style={styles.passwordHint}>
                Use 8+ characters with uppercase, lowercase, numbers, and symbols
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#0A1628" />
            ) : (
              <Text style={styles.submitButtonText}>
                {isLogin ? 'Sign In' : 'Create Account'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchButton}
            onPress={() => {
              setIsLogin(!isLogin);
              setEmailError('');
              setPasswordError('');
            }}
          >
            <Text style={styles.switchButtonText}>
              {isLogin 
                ? "Don't have an account? Sign Up" 
                : "Already have an account? Sign In"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.featuresContainer}>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>📸</Text>
            <Text style={styles.featureText}>AI Photo Analysis</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>🏗️</Text>
            <Text style={styles.featureText}>Stage Tracking</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>💰</Text>
            <Text style={styles.featureText}>Payment Gates</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A1628',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#00D4AA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoText: {
    color: '#0A1628',
    fontSize: 28,
    fontWeight: 'bold',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#8B9EB0',
    fontSize: 16,
    marginTop: 8,
  },
  formContainer: {
    backgroundColor: '#111D2E',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#1E3A5F',
  },
  formTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    color: '#8B9EB0',
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#0A1628',
    borderRadius: 12,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#1E3A5F',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 4,
  },
  strengthContainer: {
    marginTop: 8,
  },
  strengthBar: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 4,
  },
  strengthSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthText: {
    fontSize: 12,
    fontWeight: '500',
  },
  passwordHint: {
    color: '#8B9EB0',
    fontSize: 11,
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: '#00D4AA',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#0A1628',
    fontSize: 16,
    fontWeight: 'bold',
  },
  switchButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  switchButtonText: {
    color: '#00D4AA',
    fontSize: 14,
  },
  featuresContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 40,
  },
  featureItem: {
    alignItems: 'center',
    marginHorizontal: 16,
  },
  featureIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  featureText: {
    color: '#8B9EB0',
    fontSize: 12,
  },
});
