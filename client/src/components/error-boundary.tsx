import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, errorMessage: "" });
    // Naviger til forsiden som fallback
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-md w-full text-center">
            <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-7 h-7 text-destructive" />
            </div>
            <h1 className="text-xl font-semibold mb-2">
              {this.props.fallbackTitle || "Noget gik galt"}
            </h1>
            <p className="text-muted-foreground text-sm mb-6">
              Et uventet fejl opstod. Dine kladder er gemt i browseren.
            </p>
            {this.state.errorMessage && (
              <p className="text-xs text-muted-foreground font-mono bg-muted rounded p-2 mb-6 text-left break-all">
                {this.state.errorMessage}
              </p>
            )}
            <Button onClick={this.handleReset} className="w-full">
              Gå til forsiden
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
