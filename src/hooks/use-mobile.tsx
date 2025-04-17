import * as React from "react"

const MOBILE_BREAKPOINT = 768
const TABLET_BREAKPOINT = 1024

export type DeviceType = 'mobile' | 'tablet' | 'desktop' | undefined;

export function useDevice() {
  const [deviceType, setDeviceType] = React.useState<DeviceType>(undefined)

  React.useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < MOBILE_BREAKPOINT) {
        setDeviceType('mobile');
      } else if (width < TABLET_BREAKPOINT) {
        setDeviceType('tablet');
      } else {
        setDeviceType('desktop');
      }
    }
    
    // Add event listener
    window.addEventListener("resize", handleResize);
    
    // Set initial value
    handleResize();
    
    // Clean up
    return () => window.removeEventListener("resize", handleResize);
  }, [])

  return {
    deviceType,
    isMobile: deviceType === 'mobile',
    isTablet: deviceType === 'tablet',
    isDesktop: deviceType === 'desktop'
  }
}

// Keep the original hook for backward compatibility
export function useIsMobile() {
  const { isMobile } = useDevice();
  return !!isMobile;
}
