import type { Config } from "tailwindcss";

export default {
	
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			fontFamily: {
				'sans': ['Lexend', 'ui-sans-serif', 'system-ui'],
				'lexend': ['Lexend', 'sans-serif'],
			},
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
				// Professional Status Colors
				success: {
					DEFAULT: 'hsl(var(--success))',
					foreground: 'hsl(var(--success-foreground))',
					subtle: 'hsl(var(--success-subtle))',
					border: 'hsl(var(--success-border))'
				},
				warning: {
					DEFAULT: 'hsl(var(--warning))',
					foreground: 'hsl(var(--warning-foreground))',
					subtle: 'hsl(var(--warning-subtle))',
					border: 'hsl(var(--warning-border))'
				},
				info: {
					DEFAULT: 'hsl(var(--info))',
					foreground: 'hsl(var(--info-foreground))',
					subtle: 'hsl(var(--info-subtle))',
					border: 'hsl(var(--info-border))'
				},
				error: {
					DEFAULT: 'hsl(var(--error))',
					foreground: 'hsl(var(--error-foreground))',
					subtle: 'hsl(var(--error-subtle))',
					border: 'hsl(var(--error-border))'
				},
				// Status System
				status: {
					completed: 'hsl(var(--status-completed))',
					'completed-bg': 'hsl(var(--status-completed-bg))',
					'completed-border': 'hsl(var(--status-completed-border))',
					active: 'hsl(var(--status-active))',
					'active-bg': 'hsl(var(--status-active-bg))',
					'active-border': 'hsl(var(--status-active-border))',
					pending: 'hsl(var(--status-pending))',
					'pending-bg': 'hsl(var(--status-pending-bg))',
					'pending-border': 'hsl(var(--status-pending-border))',
					cancelled: 'hsl(var(--status-cancelled))',
					'cancelled-bg': 'hsl(var(--status-cancelled-bg))',
					'cancelled-border': 'hsl(var(--status-cancelled-border))',
					draft: 'hsl(var(--status-draft))',
					'draft-bg': 'hsl(var(--status-draft-bg))',
					'draft-border': 'hsl(var(--status-draft-border))',
					expired: 'hsl(var(--status-expired))',
					'expired-bg': 'hsl(var(--status-expired-bg))',
					'expired-border': 'hsl(var(--status-expired-border))',
					'in-progress': 'hsl(var(--status-in-progress))',
					'in-progress-bg': 'hsl(var(--status-in-progress-bg))',
					'in-progress-border': 'hsl(var(--status-in-progress-border))',
					confirmed: 'hsl(var(--status-confirmed))',
					'confirmed-bg': 'hsl(var(--status-confirmed-bg))',
					'confirmed-border': 'hsl(var(--status-confirmed-border))'
				},
				// Role System for Consistent Colors Across Tables - User Specified Colors
				role: {
					photographer: 'hsl(var(--role-photographer))',
					'photographer-bg': 'hsl(var(--role-photographer-bg))',
					videographer: 'hsl(var(--role-videographer))',
					'videographer-bg': 'hsl(var(--role-videographer-bg))',
					cinematographer: 'hsl(var(--role-cinematographer))',
					'cinematographer-bg': 'hsl(var(--role-cinematographer-bg))',
					editor: 'hsl(var(--role-editor))',
					'editor-bg': 'hsl(var(--role-editor-bg))',
					assistant: 'hsl(var(--role-assistant))',
					'assistant-bg': 'hsl(var(--role-assistant-bg))',
					'drone-operator': 'hsl(var(--role-drone-operator))',
					'drone-operator-bg': 'hsl(var(--role-drone-operator-bg))',
					'drone-pilot': 'hsl(var(--role-drone-pilot))',
					'drone-pilot-bg': 'hsl(var(--role-drone-pilot-bg))',
					other: 'hsl(var(--role-other))',
					'other-bg': 'hsl(var(--role-other-bg))'
				},
				// Category System - User Specified Colors
				category: {
					equipment: 'hsl(var(--category-equipment))',
					'equipment-bg': 'hsl(var(--category-equipment-bg))',
					travel: 'hsl(var(--category-travel))',
					'travel-bg': 'hsl(var(--category-travel-bg))',
					accommodation: 'hsl(var(--category-accommodation))',
					'accommodation-bg': 'hsl(var(--category-accommodation-bg))',
					food: 'hsl(var(--category-food))',
					'food-bg': 'hsl(var(--category-food-bg))',
					marketing: 'hsl(var(--category-marketing))',
					'marketing-bg': 'hsl(var(--category-marketing-bg))',
					software: 'hsl(var(--category-software))',
					'software-bg': 'hsl(var(--category-software-bg))',
					maintenance: 'hsl(var(--category-maintenance))',
					'maintenance-bg': 'hsl(var(--category-maintenance-bg))',
					salary: 'hsl(var(--category-salary))',
					'salary-bg': 'hsl(var(--category-salary-bg))',
					other: 'hsl(var(--category-other))',
					'other-bg': 'hsl(var(--category-other-bg))'
				},
				// Event type specific colors with backgrounds
				'wedding-bg': 'hsl(var(--wedding-bg))',
				'wedding-color': 'hsl(var(--wedding-color))',
				'wedding-border': 'hsl(var(--wedding-border))',
				'pre-wedding-bg': 'hsl(var(--pre-wedding-bg))',
				'pre-wedding-color': 'hsl(var(--pre-wedding-color))',
				'pre-wedding-border': 'hsl(var(--pre-wedding-border))',
				'ring-ceremony-bg': 'hsl(var(--ring-ceremony-bg))',
				'ring-ceremony-color': 'hsl(var(--ring-ceremony-color))',
				'ring-ceremony-border': 'hsl(var(--ring-ceremony-border))',
				'maternity-bg': 'hsl(var(--maternity-bg))',
				'maternity-color': 'hsl(var(--maternity-color))',
				'maternity-border': 'hsl(var(--maternity-border))',
				'others-bg': 'hsl(var(--others-bg))',
				'others-color': 'hsl(var(--others-color))',
				'others-border': 'hsl(var(--others-border))'
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;