import React, { Component, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Theme, themes } from '../theme';

interface Props {
  children: ReactNode;
  theme?: Theme;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    // 未来可接入本地日志或崩溃上报；V1 只打印，不上传。
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught:', error);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    this.props.onReset?.();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const theme = this.props.theme ?? themes.day;
    const isDev = __DEV__;

    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={[styles.title, { color: theme.heading }]}>墨览遇到了一点问题</Text>
        <Text style={[styles.message, { color: theme.textSecondary }]}>
          请尝试重新选择文件，或回到首页继续。你的文件不会因此丢失。
        </Text>
        {isDev && this.state.error ? (
          <Text style={[styles.detail, { color: theme.textSecondary }]} numberOfLines={4}>
            {this.state.error.message}
          </Text>
        ) : null}
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.link }]}
          onPress={this.handleReset}
        >
          <Text style={styles.buttonText}>回到首页</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 28,
  },
  detail: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 24,
    opacity: 0.7,
  },
  button: {
    minHeight: 50,
    borderRadius: 12,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
