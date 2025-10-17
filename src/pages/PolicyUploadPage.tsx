
import { useState } from 'react';
import UploadPolicy from '../components/PolicyUpload';
import { Policy } from '../types';

export default function PolicyUploadPage() {
  const [policies, setPolicies] = useState<Policy[]>([]);

  interface UploadResult {
    policy?: PolicyWithOptionalFields;
    [key: string]: any;
  }

  type PolicyWithOptionalFields = Policy & {
    premium?: number;
    notifications?: any[];
  };

  const handleUploadComplete = (uploadResult: UploadResult): void => {
    console.log('Upload complete:', uploadResult);

    if (uploadResult.policy) {
      // Ensure the policy has all required fields
      const newPolicy: Policy = {
        ...uploadResult.policy,
        premium: uploadResult.policy.premium || 0,
        notifications: uploadResult.policy.notifications || []
      };

      setPolicies((prevPolicies: Policy[]) => [...prevPolicies, newPolicy]);
      console.log('Policy added to list');
    }
  };

  return (
    <UploadPolicy onUploadComplete={handleUploadComplete} />
  )
}