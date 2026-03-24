import NextLink from 'next/link';

type LinkProps = React.ComponentPropsWithoutRef<typeof NextLink>;

export function Link(props: LinkProps) {
  return <NextLink {...props} />;
}
