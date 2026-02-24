'use client'

// import { LogoIcon } from '@/components/logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn, useSession } from 'next-auth/react'

type PasswordStrength = 'weak' | 'medium' | 'strong' | null

export default function LoginPage() {
    const router = useRouter()
    const { data: session } = useSession()
    const [firstname, setFirstname] = useState('')
    const [lastname, setLastname] = useState('')
    const [username, setUsername] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>(null)
    const [error, setError] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    const checkPasswordStrength = (pwd: string): PasswordStrength => {
        if (pwd.length === 0) return null
        
        const hasUpperCase = /[A-Z]/.test(pwd)
        const hasNumber = /[0-9]/.test(pwd)
        const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd)
        const isLongEnough = pwd.length >= 8
        
        const criteriasMet = [hasUpperCase, hasNumber, hasSpecialChar, isLongEnough].filter(Boolean).length
        
        if (criteriasMet <= 2) return 'weak'
        if (criteriasMet === 3) return 'medium'
        return 'strong'
    }

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newPassword = e.target.value
        setPassword(newPassword)
        setPasswordStrength(checkPasswordStrength(newPassword))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setIsLoading(true)

        try {
            // Register the user
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    firstname,
                    lastname,
                    username,
                    email,
                    password,
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                setError(data.error || 'Something went wrong')
            } else {
                // Sign in the user automatically after registration
                const result = await signIn('credentials', {
                    email,
                    password,
                    redirect: false,
                })

                if (result?.error) {
                    setError('Registration successful but sign-in failed. Please sign in manually.')
                    router.push('/auth/sign-in')
                } else {
                    // Use slug from registration response
                    if (data.slug) {
                        router.push(`/billing/${data.slug}`)
                    } else {
                        // Fallback: wait for session to load and use slug from there
                        setTimeout(() => {
                            if (session?.user?.slug) {
                                router.push(`/billing/${session.user.slug}`)
                            } else {
                                router.push('/auth/sign-in')
                            }
                        }, 500)
                    }
                }
            }
        } catch (error) {
            setError('Something went wrong')
        } finally {
            setIsLoading(false)
        }
    }

    const getStrengthColor = () => {
        switch (passwordStrength) {
            case 'weak': return 'bg-red-500'
            case 'medium': return 'bg-yellow-500'
            case 'strong': return 'bg-green-500'
            default: return 'bg-gray-300'
        }
    }

    const getStrengthWidth = () => {
        switch (passwordStrength) {
            case 'weak': return 'w-1/3'
            case 'medium': return 'w-2/3'
            case 'strong': return 'w-full'
            default: return 'w-0'
        }
    }

    return (
        <section className="flex min-h-screen bg-zinc-50 px-4 py-16 md:py-32 dark:bg-transparent">
            <form
                onSubmit={handleSubmit}
                className="bg-muted m-auto h-fit w-full max-w-sm overflow-hidden rounded-[calc(var(--radius)+.125rem)] border shadow-md shadow-zinc-950/5 dark:[--color-muted:var(--color-zinc-900)]">
                <div className="bg-card -m-px rounded-[calc(var(--radius)+.125rem)] border p-8 pb-6">
                    <div className="text-center">
                        <Link
                            href="/"
                            aria-label="go home"
                            className="mx-auto block w-fit">
                            {/* <LogoIcon /> */}
                        </Link>
                        <h1 className="mb-1 mt-4 text-xl font-semibold">Create an account for Doodlea</h1>
                        <p className="text-sm">Welcome! Create an account to get started</p>
                    </div>

                    {error && (
                        <div className="mt-4 p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded">
                            {error}
                        </div>
                    )}

                    <div className="mt-6 space-y-6">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label
                                    htmlFor="firstname"
                                    className="block text-sm">
                                    Firstname
                                </Label>
                                <Input
                                    type="text"
                                    required
                                    name="firstname"
                                    id="firstname"
                                    value={firstname}
                                    onChange={(e) => setFirstname(e.target.value)}
                                    disabled={isLoading}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label
                                    htmlFor="lastname"
                                    className="block text-sm">
                                    Lastname
                                </Label>
                                <Input
                                    type="text"
                                    required
                                    name="lastname"
                                    id="lastname"
                                    value={lastname}
                                    onChange={(e) => setLastname(e.target.value)}
                                    disabled={isLoading}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label
                                htmlFor="username"
                                className="block text-sm">
                                Username
                            </Label>
                            <Input
                                type="text"
                                required
                                name="username"
                                id="username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                disabled={isLoading}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label
                                htmlFor="email"
                                className="block text-sm">
                                Email Address
                            </Label>
                            <Input
                                type="email"
                                required
                                name="email"
                                id="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={isLoading}
                            />
                        </div>

                        <div className="space-y-0.5">
                            <div className="flex items-center justify-between">
                                <Label
                                    htmlFor="pwd"
                                    className="text-sm">
                                    Password
                                </Label>
                                <Button
                                    asChild
                                    variant="link"
                                    size="sm">
                                    <Link
                                        href="#"
                                        className="link intent-info variant-ghost text-sm">
                                        Forgot your Password ?
                                    </Link>
                                </Button>
                            </div>
                            <Input
                                type="password"
                                required
                                name="pwd"
                                id="pwd"
                                className="input sz-md variant-mixed"
                                value={password}
                                onChange={handlePasswordChange}
                                disabled={isLoading}
                            />
                            {password.length > 0 && (
                                <div className="mt-2 space-y-1">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-muted-foreground">Password strength:</span>
                                        <span className={`font-medium capitalize ${
                                            passwordStrength === 'weak' ? 'text-red-500' : 
                                            passwordStrength === 'medium' ? 'text-yellow-500' : 
                                            'text-green-500'
                                        }`}>
                                            {passwordStrength}
                                        </span>
                                    </div>
                                    <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full ${getStrengthColor()} ${getStrengthWidth()} transition-all duration-300 ease-in-out`}
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Must contain: uppercase, number, special character
                                    </p>
                                </div>
                            )}
                        </div>

                        <Button type="submit" className="w-full" disabled={isLoading || passwordStrength !== 'strong'}>
                            {isLoading ? 'Creating account...' : 'Sign Up'}
                        </Button>

                        <div className="my-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                            <hr className="border-dashed" />
                            <span className="text-muted-foreground text-xs">Or continue</span>
                            <hr className="border-dashed" />
                        </div>

                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => signIn('google', { callbackUrl: '/' })}
                            disabled={isLoading}
                            className="w-full">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="0.98em"
                                height="1em"
                                viewBox="0 0 256 262">
                                <path
                                    fill="#4285f4"
                                    d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622l38.755 30.023l2.685.268c24.659-22.774 38.875-56.282 38.875-96.027"></path>
                                <path
                                    fill="#34a853"
                                    d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055c-34.523 0-63.824-22.773-74.269-54.25l-1.531.13l-40.298 31.187l-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1"></path>
                                <path
                                    fill="#fbbc05"
                                    d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82c0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602z"></path>
                                <path
                                    fill="#eb4335"
                                    d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0C79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251"></path>
                            </svg>
                            <span>Google</span>
                        </Button>
                    </div>
                </div>

                <div className="p-3">
                    <p className="text-accent-foreground text-center text-sm">
                        Have an account ?
                        <Button
                            asChild
                            variant="link"
                            className="px-2">
                            <Link href="/auth/sign-in">Sign In</Link>
                        </Button>
                    </p>
                </div>
            </form>
        </section>
    )
}