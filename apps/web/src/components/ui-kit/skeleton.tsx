import { cn } from '@/lib/utils';

/**
 * Skeleton — docs/15_UI_SPEC_v1.md §9.
 *
 * `hs-skeleton` (tokens.css) is a 1.4s opacity pulse, deliberately not a moving shimmer gradient:
 * a shimmer repaints a gradient across the element every frame, and this product runs on low-end
 * laptops and five-year-old Androids where that is a measurable cost for a decorative effect.
 *
 * §10 requires skeletons to match the final geometry exactly — same row height, same column
 * widths — so the content does not jump when it arrives. Callers pass those dimensions.
 */
function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      // Purely decorative: the loading state is announced by the region's own aria-busy, and a
      // screen reader reading out eight grey rectangles helps nobody.
      aria-hidden
      className={cn('hs-skeleton', className)}
      {...props}
    />
  );
}

export { Skeleton };
