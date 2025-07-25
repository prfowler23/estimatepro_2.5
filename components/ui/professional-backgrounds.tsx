import React from "react";

interface BackgroundProps {
  className?: string;
  children?: React.ReactNode;
}

// Subtle gradient mesh background using your primary blues
export const GradientMeshBackground: React.FC<BackgroundProps> = ({
  className = "",
  children,
}) => (
  <div className={`relative min-h-screen ${className}`}>
    <div className="absolute inset-0 bg-gradient-to-br from-primary-50 via-bg-base to-primary-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900" />
    <div className="absolute inset-0 bg-gradient-to-tr from-primary-100/20 via-transparent to-primary-200/30 dark:from-primary-900/20 dark:via-transparent dark:to-primary-800/30" />
    <div className="relative z-10">{children}</div>
  </div>
);

// Geometric grid pattern background
export const GeometricGridBackground: React.FC<BackgroundProps> = ({
  className = "",
  children,
}) => (
  <div className={`relative min-h-screen bg-bg-base ${className}`}>
    <div
      className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
      style={{
        backgroundImage: `
          linear-gradient(var(--color-primary-500) 1px, transparent 1px),
          linear-gradient(90deg, var(--color-primary-500) 1px, transparent 1px)
        `,
        backgroundSize: "60px 60px",
      }}
    />
    <div className="relative z-10">{children}</div>
  </div>
);

// Subtle radial gradient background
export const RadialGradientBackground: React.FC<BackgroundProps> = ({
  className = "",
  children,
}) => (
  <div className={`relative min-h-screen ${className}`}>
    <div className="absolute inset-0 bg-bg-base" />
    <div
      className="absolute inset-0"
      style={{
        background: `
          radial-gradient(circle at 25% 25%, var(--color-primary-100) 0%, transparent 50%),
          radial-gradient(circle at 75% 75%, var(--color-primary-50) 0%, transparent 50%),
          radial-gradient(circle at 50% 50%, var(--color-gray-50) 0%, transparent 50%)
        `,
      }}
    />
    <div className="dark:absolute dark:inset-0 dark:bg-gray-900/90" />
    <div className="relative z-10">{children}</div>
  </div>
);

// Animated gradient waves
export const AnimatedWaveBackground: React.FC<BackgroundProps> = ({
  className = "",
  children,
}) => (
  <div
    className={`relative min-h-screen overflow-hidden bg-bg-base ${className}`}
  >
    <div className="absolute inset-0">
      <div
        className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] animate-pulse"
        style={{
          background: `
            conic-gradient(from 0deg at 50% 50%, 
              var(--color-primary-100) 0deg, 
              transparent 60deg, 
              var(--color-primary-50) 120deg, 
              transparent 180deg, 
              var(--color-primary-100) 240deg, 
              transparent 300deg, 
              var(--color-primary-50) 360deg
            )
          `,
          opacity: "0.1",
          animation: "spin 60s linear infinite",
        }}
      />
    </div>
    <div className="dark:absolute dark:inset-0 dark:bg-gray-900/95" />
    <div className="relative z-10">{children}</div>
  </div>
);

// Corporate diagonal stripes
export const DiagonalStripesBackground: React.FC<BackgroundProps> = ({
  className = "",
  children,
}) => (
  <div className={`relative min-h-screen bg-bg-base ${className}`}>
    <div
      className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03]"
      style={{
        backgroundImage: `
          repeating-linear-gradient(
            45deg,
            var(--color-primary-600),
            var(--color-primary-600) 1px,
            transparent 1px,
            transparent 40px
          )
        `,
      }}
    />
    <div className="relative z-10">{children}</div>
  </div>
);

// Hexagonal pattern
export const HexagonPatternBackground: React.FC<BackgroundProps> = ({
  className = "",
  children,
}) => (
  <div className={`relative min-h-screen bg-bg-base ${className}`}>
    <div
      className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
      style={{
        backgroundImage: `
          radial-gradient(circle at 25px 25px, var(--color-primary-500) 2px, transparent 2px),
          radial-gradient(circle at 75px 75px, var(--color-primary-400) 1px, transparent 1px)
        `,
        backgroundSize: "100px 100px",
      }}
    />
    <div className="relative z-10">{children}</div>
  </div>
);

// Layered paper effect
export const LayeredPaperBackground: React.FC<BackgroundProps> = ({
  className = "",
  children,
}) => (
  <div className={`relative min-h-screen ${className}`}>
    <div className="absolute inset-0 bg-bg-base" />
    <div className="absolute inset-0 bg-gradient-to-b from-primary-50/50 via-transparent to-primary-100/30 dark:from-gray-800/30 dark:via-transparent dark:to-gray-700/20" />
    <div
      className="absolute inset-0 opacity-[0.8]"
      style={{
        backgroundImage: `
          linear-gradient(90deg, transparent 0%, var(--color-border-primary) 50%, transparent 100%)
        `,
        backgroundSize: "200px 1px",
        backgroundRepeat: "repeat-y",
      }}
    />
    <div className="relative z-10">{children}</div>
  </div>
);

// Professional card stack effect
export const CardStackBackground: React.FC<BackgroundProps> = ({
  className = "",
  children,
}) => (
  <div className={`relative min-h-screen bg-bg-base ${className}`}>
    <div className="absolute inset-0">
      <div className="absolute top-20 left-20 w-80 h-60 bg-primary-50/40 dark:bg-gray-800/40 rounded-lg shadow-sm transform rotate-3" />
      <div className="absolute top-32 right-32 w-72 h-48 bg-primary-100/30 dark:bg-gray-700/30 rounded-lg shadow-sm transform -rotate-2" />
      <div className="absolute bottom-40 left-1/3 w-64 h-40 bg-gray-50/50 dark:bg-gray-800/30 rounded-lg shadow-sm transform rotate-1" />
    </div>
    <div className="relative z-10">{children}</div>
  </div>
);

// Usage examples
export const BackgroundShowcase: React.FC = () => (
  <div className="p-8 space-y-8">
    <div className="text-center mb-8">
      <h2 className="text-3xl font-bold text-text-primary mb-4">
        Professional Background Collection
      </h2>
      <p className="text-text-secondary">Using your existing color system</p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* Preview cards for each background */}
      <div className="relative h-64 rounded-lg overflow-hidden border border-border-primary">
        <GradientMeshBackground>
          <div className="p-6 h-full flex items-center justify-center">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-text-primary mb-2">
                Gradient Mesh
              </h3>
              <p className="text-text-secondary">Subtle gradient overlay</p>
            </div>
          </div>
        </GradientMeshBackground>
      </div>

      <div className="relative h-64 rounded-lg overflow-hidden border border-border-primary">
        <GeometricGridBackground>
          <div className="p-6 h-full flex items-center justify-center">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-text-primary mb-2">
                Geometric Grid
              </h3>
              <p className="text-text-secondary">Clean grid pattern</p>
            </div>
          </div>
        </GeometricGridBackground>
      </div>

      <div className="relative h-64 rounded-lg overflow-hidden border border-border-primary">
        <RadialGradientBackground>
          <div className="p-6 h-full flex items-center justify-center">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-text-primary mb-2">
                Radial Gradient
              </h3>
              <p className="text-text-secondary">Soft radial effects</p>
            </div>
          </div>
        </RadialGradientBackground>
      </div>

      <div className="relative h-64 rounded-lg overflow-hidden border border-border-primary">
        <AnimatedWaveBackground>
          <div className="p-6 h-full flex items-center justify-center">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-text-primary mb-2">
                Animated Waves
              </h3>
              <p className="text-text-secondary">Subtle animation</p>
            </div>
          </div>
        </AnimatedWaveBackground>
      </div>

      <div className="relative h-64 rounded-lg overflow-hidden border border-border-primary">
        <DiagonalStripesBackground>
          <div className="p-6 h-full flex items-center justify-center">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-text-primary mb-2">
                Diagonal Stripes
              </h3>
              <p className="text-text-secondary">Corporate pattern</p>
            </div>
          </div>
        </DiagonalStripesBackground>
      </div>

      <div className="relative h-64 rounded-lg overflow-hidden border border-border-primary">
        <HexagonPatternBackground>
          <div className="p-6 h-full flex items-center justify-center">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-text-primary mb-2">
                Hexagon Pattern
              </h3>
              <p className="text-text-secondary">Geometric dots</p>
            </div>
          </div>
        </HexagonPatternBackground>
      </div>

      <div className="relative h-64 rounded-lg overflow-hidden border border-border-primary">
        <LayeredPaperBackground>
          <div className="p-6 h-full flex items-center justify-center">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-text-primary mb-2">
                Layered Paper
              </h3>
              <p className="text-text-secondary">Paper texture effect</p>
            </div>
          </div>
        </LayeredPaperBackground>
      </div>

      <div className="relative h-64 rounded-lg overflow-hidden border border-border-primary">
        <CardStackBackground>
          <div className="p-6 h-full flex items-center justify-center">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-text-primary mb-2">
                Card Stack
              </h3>
              <p className="text-text-secondary">Layered card effect</p>
            </div>
          </div>
        </CardStackBackground>
      </div>
    </div>
  </div>
);
