import { Box } from '@/components/ui/box';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { Link, Stack } from 'expo-router';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <Box className="flex-1 items-center justify-center p-5">
        <Text className="text-xl font-bold">This screen doesn't exist.</Text>
        <Link href="/" asChild>
          <Pressable className="mt-4 py-4">
            <Text className="font-medium text-primary-500">
              Go to home screen!
            </Text>
          </Pressable>
        </Link>
      </Box>
    </>
  );
}
