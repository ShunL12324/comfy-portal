import { Button, ButtonIcon, ButtonText } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Node } from '@/features/workflow/types';
import { GitBranch } from 'lucide-react-native';
import React, { ReactNode } from 'react';
import { Linking, View } from 'react-native';

interface SubItemProps {
  title: string;
  children?: ReactNode;
  className?: string;
  rightComponent?: ReactNode;
  node?: Node;
  dependencies?: string[];
}

export default function SubItem({ title, children, className, rightComponent, node, dependencies }: SubItemProps) {
  if (node && dependencies) {
    const dependencyStatus = dependencies.map((dependency) => {
      const value = node.inputs[dependency];
      if (value === undefined) {
        return { dependency, status: 'missing' as const };
      }
      if (Array.isArray(value)) {
        return { dependency, status: 'linked' as const };
      }
      return { dependency, status: 'valid' as const };
    });

    const hasInvalidDependencies = dependencyStatus.some(({ status }) => status !== 'valid');

    if (hasInvalidDependencies) {
      const missingDeps = dependencyStatus
        .filter(({ status }) => status === 'missing')
        .map(({ dependency }) => dependency);
      const linkedDeps = dependencyStatus
        .filter(({ status }) => status === 'linked')
        .map(({ dependency }) => dependency);

      return (
        <View className={`mt-4 ${className}`}>
          <View className="mb-1 flex-row items-center justify-between">
            <Text size="sm" className="flex-1 truncate text-typography-700">
              {title}
            </Text>
            {rightComponent}
          </View>
          {children && (
            <View>
              <Text size="sm" className="text-typography-500">
                {missingDeps.length > 0 && <>The following inputs are missing: {missingDeps.join(', ')}.</>}
                {missingDeps.length > 0 && linkedDeps.length > 0 && <>{'\n'}</>}
                {linkedDeps.length > 0 && (
                  <>
                    The following inputs are linked to other nodes:{' '}
                    {linkedDeps.map((dep, index) => (
                      <React.Fragment key={dep}>
                        {index > 0 && ', '}
                        <Text size="sm" className="text-typography-500" underline>
                          {dep}
                        </Text>
                      </React.Fragment>
                    ))}
                    .
                  </>
                )}
                {missingDeps.length > 0 && (
                  <>
                    {'\n\n'}
                    Please ensure this workflow is configured correctly and it can be run through the web page of the
                    ComfyUI server. If problem persists, consider reporting this issue to the developer.
                  </>
                )}
              </Text>
              {missingDeps.length > 0 && (
                <Button
                  size="sm"
                  variant="solid"
                  onPress={() => {
                    Linking.openURL('https://github.com/ShunL12324/comfy-portal/issues');
                  }}
                  className="mt-2"
                >
                  <ButtonIcon as={GitBranch} size="sm" className="text-typography-0" />
                  <ButtonText size="sm" className="text-typography-0">
                    Report Issue
                  </ButtonText>
                </Button>
              )}
            </View>
          )}
        </View>
      );
    }
  }

  return (
    <View className={`mt-4 ${className}`}>
      <View className="mb-1 flex-row items-center justify-between">
        <Text size="sm" className="flex-1 truncate text-typography-700">
          {title}
        </Text>
        {rightComponent}
      </View>
      {children && <View>{children}</View>}
    </View>
  );
}
