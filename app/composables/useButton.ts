import { cva, type VariantProps } from 'class-variance-authority'
import { twMerge } from 'tailwind-merge'

export const buttonVariants = cva({
  base: 'inline-flex items-center justify-center gap-2 font-medium text-sm rounded-xl min-h-[2.75rem] transition-all duration-150 ease-in-out cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none',
  variants: {
    intent: {
      primary: 'btn-primary',
      secondary: 'btn-secondary',
      ghost: 'btn-ghost',
      danger: 'btn-danger',
    },
    size: {
      sm: 'px-3 py-1.5 text-xs min-h-[2rem]',
      md: 'px-5 py-2.5',
      lg: 'px-6 py-3 text-base min-h-[3rem]',
    },
    fullWidth: {
      true: 'w-full',
    },
  },
  defaultVariants: {
    intent: 'primary',
    size: 'md',
  },
})

export type ButtonVariants = VariantProps<typeof buttonVariants>

export function useButton(intent?: ButtonVariants['intent'], size?: ButtonVariants['size'], fullWidth?: boolean, className?: string) {
  return twMerge(buttonVariants({ intent, size, fullWidth }), className)
}
