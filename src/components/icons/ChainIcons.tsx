import baseLogo from '@/assets/chains/base.png';
import arbitrumLogo from '@/assets/chains/arbitrum.png';
import ethereumLogo from '@/assets/chains/ethereum.png';
import optimismLogo from '@/assets/chains/optimism.png';
import polygonLogo from '@/assets/chains/polygon.png';

interface ChainIconProps {
  size?: number;
  className?: string;
}

/** All Chains — concentric rings */
function AllChainsIcon({ size = 14, className }: ChainIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      <circle cx="8" cy="8" r="4" stroke="currentColor" strokeWidth="1" opacity="0.7" />
      <circle cx="8" cy="8" r="1.5" fill="currentColor" opacity="0.9" />
    </svg>
  );
}

function ImgIcon({ src, size = 14, className }: ChainIconProps & { src: string }) {
  return <img src={src} alt="" width={size} height={size} className={`rounded-full ${className ?? ''}`} />;
}

const CHAIN_ICONS: Record<number, React.FC<ChainIconProps>> = {
  0: AllChainsIcon,
  1: (props) => <ImgIcon src={ethereumLogo} {...props} />,
  8453: (props) => <ImgIcon src={baseLogo} {...props} />,
  42161: (props) => <ImgIcon src={arbitrumLogo} {...props} />,
  10: (props) => <ImgIcon src={optimismLogo} {...props} />,
  137: (props) => <ImgIcon src={polygonLogo} {...props} />,
};

export { CHAIN_ICONS };
export type { ChainIconProps };
