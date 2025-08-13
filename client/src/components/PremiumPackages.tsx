import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Crown, 
  Check, 
  Wallet, 
  Plus, 
  Loader2,
  Star,
  Zap,
  Shield,
  Gift
} from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { User, PremiumPackage, TopUpInput } from '../../../server/src/schema';

interface PremiumPackagesProps {
  currentUser: User;
  onUserUpdate: (updatedUser: User) => void;
}

export function PremiumPackages({ currentUser, onUserUpdate }: PremiumPackagesProps) {
  const [packages, setPackages] = useState<PremiumPackage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [topUpAmount, setTopUpAmount] = useState<number>(10);
  const [isTopUpLoading, setIsTopUpLoading] = useState(false);
  const [purchasingPackage, setPurchasingPackage] = useState<number | null>(null);

  const loadPackages = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await trpc.getPremiumPackages.query();
      setPackages(result);
    } catch (error) {
      console.error('Failed to load packages:', error);
      setError('Failed to load premium packages.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPackages();
  }, [loadPackages]);

  const handleTopUp = async () => {
    if (topUpAmount <= 0) return;
    
    setIsTopUpLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const topUpData: TopUpInput = {
        user_id: currentUser.id,
        amount: topUpAmount
      };
      
      await trpc.topUpBalance.mutate(topUpData);
      
      // Update user balance locally
      const updatedUser = { ...currentUser, balance: currentUser.balance + topUpAmount };
      onUserUpdate(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      setSuccess(`Successfully topped up $${topUpAmount.toFixed(2)}! 💰`);
      setTopUpAmount(10);
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Failed to top up:', error);
      setError('Failed to top up balance. Please try again.');
    } finally {
      setIsTopUpLoading(false);
    }
  };

  const handlePurchase = async (packageId: number, price: number) => {
    if (currentUser.balance < price) {
      setError('Insufficient balance! Please top up your account first.');
      return;
    }

    setPurchasingPackage(packageId);
    setError(null);
    setSuccess(null);

    try {
      await trpc.purchasePremium.mutate({ userId: currentUser.id, packageId });
      
      // Update user status locally
      const updatedUser = { 
        ...currentUser, 
        balance: currentUser.balance - price,
        is_premium: true,
        premium_expires_at: new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)) // 30 days from now
      };
      onUserUpdate(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      setSuccess(`Welcome to Premium! 🎉 Your subscription is now active.`);
      setTimeout(() => setSuccess(null), 5000);
    } catch (error) {
      console.error('Failed to purchase premium:', error);
      setError('Failed to purchase premium package. Please try again.');
    } finally {
      setPurchasingPackage(null);
    }
  };

  const formatDuration = (days: number) => {
    if (days < 30) return `${days} days`;
    if (days < 365) return `${Math.floor(days / 30)} months`;
    return `${Math.floor(days / 365)} years`;
  };

  const getPackageIcon = (name: string) => {
    if (name.toLowerCase().includes('basic')) return <Star className="h-6 w-6" />;
    if (name.toLowerCase().includes('pro')) return <Zap className="h-6 w-6" />;
    if (name.toLowerCase().includes('premium')) return <Crown className="h-6 w-6" />;
    return <Gift className="h-6 w-6" />;
  };

  const getPackageGradient = (name: string) => {
    if (name.toLowerCase().includes('basic')) return 'from-blue-500 to-blue-600';
    if (name.toLowerCase().includes('pro')) return 'from-purple-500 to-purple-600';
    if (name.toLowerCase().includes('premium')) return 'from-yellow-400 to-orange-500';
    return 'from-pink-500 to-pink-600';
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <Crown className="h-10 w-10 text-yellow-500" />
          <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
            Premium Packages
          </h1>
        </div>
        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Unlock exclusive features and elevate your social experience! ✨
        </p>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400">
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Balance & Top Up */}
      <Card className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-green-600" />
            Your Balance
          </CardTitle>
          <CardDescription>
            Current balance: ${currentUser.balance.toFixed(2)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="topup-amount">Top Up Amount</Label>
              <Input
                id="topup-amount"
                type="number"
                min="1"
                step="0.01"
                value={topUpAmount}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  setTopUpAmount(parseFloat(e.target.value) || 0)
                }
                placeholder="Enter amount"
                disabled={isTopUpLoading}
                className="mt-2"
              />
            </div>
            <div className="flex gap-2">
              {[10, 25, 50, 100].map((amount) => (
                <Button
                  key={amount}
                  variant="outline"
                  size="sm"
                  onClick={() => setTopUpAmount(amount)}
                  disabled={isTopUpLoading}
                  className="hover:bg-green-50 dark:hover:bg-green-900/20"
                >
                  ${amount}
                </Button>
              ))}
            </div>
            <Button
              onClick={handleTopUp}
              disabled={isTopUpLoading || topUpAmount <= 0}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
            >
              {isTopUpLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Top Up
                </div>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Current Status */}
      {currentUser.is_premium && (
        <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-200 dark:border-yellow-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-full p-3">
                <Crown className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-yellow-800 dark:text-yellow-200">
                  You're a Premium Member! 🎉
                </h3>
                <p className="text-yellow-700 dark:text-yellow-300">
                  {currentUser.premium_expires_at 
                    ? `Your premium expires on ${new Date(currentUser.premium_expires_at).toLocaleDateString()}`
                    : 'Enjoying all premium features'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Premium Packages */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="flex items-center gap-2 text-gray-500">
            <Loader2 className="h-6 w-6 animate-spin" />
            Loading premium packages...
          </div>
        </div>
      ) : packages.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Crown className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
              No Premium Packages Available
            </h3>
            <p className="text-gray-500">
              Premium packages will be available soon! Stay tuned for amazing features.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {packages.map((pkg: PremiumPackage) => (
            <Card key={pkg.id} className="hover:shadow-lg transition-all duration-200 relative overflow-hidden">
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${getPackageGradient(pkg.name)}`} />
              
              <CardHeader className="text-center">
                <div className={`w-16 h-16 mx-auto bg-gradient-to-r ${getPackageGradient(pkg.name)} rounded-full flex items-center justify-center text-white mb-4`}>
                  {getPackageIcon(pkg.name)}
                </div>
                <CardTitle className="text-2xl">{pkg.name}</CardTitle>
                <CardDescription className="text-base">
                  {pkg.description || 'Premium features await you!'}
                </CardDescription>
                <div className="text-center mt-4">
                  <div className="text-4xl font-bold text-gray-900 dark:text-white">
                    ${pkg.price}
                  </div>
                  <div className="text-sm text-gray-500">
                    for {formatDuration(pkg.duration_days)}
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <div className="space-y-3 mb-6">
                  {pkg.features.map((feature: string, index: number) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className={`w-5 h-5 bg-gradient-to-r ${getPackageGradient(pkg.name)} rounded-full flex items-center justify-center flex-shrink-0`}>
                        <Check className="h-3 w-3 text-white" />
                      </div>
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>

                <Separator className="mb-6" />

                <Button
                  onClick={() => handlePurchase(pkg.id, pkg.price)}
                  disabled={purchasingPackage === pkg.id || currentUser.is_premium || currentUser.balance < pkg.price}
                  className={`w-full bg-gradient-to-r ${getPackageGradient(pkg.name)} hover:opacity-90 text-white font-medium py-3`}
                >
                  {purchasingPackage === pkg.id ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing...
                    </div>
                  ) : currentUser.is_premium ? (
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Already Premium
                    </div>
                  ) : currentUser.balance < pkg.price ? (
                    <div className="flex items-center gap-2">
                      <Wallet className="h-4 w-4" />
                      Insufficient Balance
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Crown className="h-4 w-4" />
                      Purchase Now
                    </div>
                  )}
                </Button>

                {currentUser.balance < pkg.price && !currentUser.is_premium && (
                  <p className="text-xs text-center text-red-500 mt-2">
                    Need ${(pkg.price - currentUser.balance).toFixed(2)} more
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Premium Benefits */}
      <Card className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
        <CardHeader>
          <CardTitle className="text-center text-2xl">
            ✨ Why Go Premium? ✨
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6 text-center">
            <div>
              <Star className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
              <h3 className="font-semibold mb-2">Exclusive Features</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Access premium-only features and content that regular users can't see
              </p>
            </div>
            <div>
              <Zap className="h-12 w-12 mx-auto text-purple-500 mb-4" />
              <h3 className="font-semibold mb-2">Enhanced Experience</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Enjoy faster loading, priority support, and advanced customization options
              </p>
            </div>
            <div>
              <Crown className="h-12 w-12 mx-auto text-orange-500 mb-4" />
              <h3 className="font-semibold mb-2">VIP Status</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Stand out with premium badges and get recognition in the community
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}