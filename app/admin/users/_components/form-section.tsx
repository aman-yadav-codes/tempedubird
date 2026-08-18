import type { ReactNode } from "react";

type FormSectionProps = {
    title: ReactNode;
    action?: ReactNode;
    children: ReactNode;
    className?: string;
};

export function FormSection({ title, action, children, className }: FormSectionProps) {
    return (
        <section className={className ?? "space-y-3"}>
            <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold">{title}</h3>
                {action}
            </div>
            {children}
        </section>
    );
}
