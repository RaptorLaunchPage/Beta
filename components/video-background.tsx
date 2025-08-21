"use client"

import React from "react"

interface VideoBackgroundProps {
	children: React.ReactNode
}

export function VideoBackground({ children }: VideoBackgroundProps) {
	return (
		<div className="relative min-h-screen w-full overflow-hidden">
			{/* Static Background (no image/video) */}
			<div className="absolute inset-0 bg-black" style={{ zIndex: -1 }} />
			{/* Content */}
			<div className="relative z-10 h-full w-full">
				{children}
			</div>
		</div>
	)
}