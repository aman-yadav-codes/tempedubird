type FieldErrorProps = {
    message?: string;
};

export function FieldError({ message }: FieldErrorProps) {
    if (!message) return null;

    return <p className="text-xs text-destructive">{message}</p>;
}
