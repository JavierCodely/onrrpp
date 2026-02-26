import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      toastOptions={{
        unstyled: false,
        classNames: {
          toast: "bg-card text-card-foreground ring-2 ring-primary shadow-lg backdrop-blur-sm",
          title: "!text-current font-medium",
          description: "!text-current opacity-90",
          actionButton: "bg-primary text-primary-foreground",
          cancelButton: "bg-secondary text-secondary-foreground",
          closeButton: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
          success: "!border-green-500 !bg-green-50 dark:!bg-green-950 !text-green-700 dark:!text-green-300",
          error: "!border-red-500 !bg-red-50 dark:!bg-red-950 !text-red-700 dark:!text-red-300",
          warning: "!border-yellow-500 !bg-yellow-50 dark:!bg-yellow-950 !text-yellow-700 dark:!text-yellow-300",
          info: "!border-blue-500 !bg-blue-50 dark:!bg-blue-950 !text-blue-700 dark:!text-blue-300",
          loading: "ring-2 ring-primary bg-card",
        },
      }}
      style={
        {
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
