import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import * as LabelPrimitive from "@radix-ui/react-label";
import { Check } from "lucide-react";
import { cn } from "@/utils/cn";
import { cva, type VariantProps } from "class-variance-authority";

const Root = CheckboxPrimitive.Root;
const Indicator = CheckboxPrimitive.Indicator;
const Label = LabelPrimitive.Root;

const checkboxVariants = cva(
  "peer h-4 w-4 shrink-0 rounded-sm border border-input ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
  {
    variants: {
      variant: {
        default: "",
        error:
          "border-destructive data-[state=checked]:bg-destructive data-[state=checked]:text-destructive-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface CheckboxProps
  extends React.ComponentPropsWithoutRef<typeof Root>,
    VariantProps<typeof checkboxVariants> {
  label?: string;
  error?: string;
}

const Checkbox = React.forwardRef<
  React.ElementRef<typeof Root>,
  CheckboxProps
>(({ className, variant, label, error, ...props }, ref) => {
  const id = React.useId();

  return (
    <div className="flex items-center space-x-2">
      <Root
        id={id}
        ref={ref}
        className={cn(checkboxVariants({ variant }), className)}
        {...props}
      >
        <Indicator className="flex items-center justify-center text-current">
          <Check className="h-4 w-4" />
        </Indicator>
      </Root>

      {label && (
        <Label
          htmlFor={id}
          className={cn(
            "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
            error && "text-destructive"
          )}
        >
          {label}
        </Label>
      )}

      {error && !label && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
});
Checkbox.displayName = "Checkbox";

export { Checkbox, checkboxVariants };
