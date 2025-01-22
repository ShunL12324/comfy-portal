import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Box } from '@/components/ui/box';
import { Link } from '@/components/ui/link';
import { ScrollView } from '@/components/ui/scroll-view';
import { Text } from '@/components/ui/text';

export default function ExploreScreen() {
  return (
    <ScrollView className="bg-background-0">
      <Box className="flex-1 p-5">
        <Box className="mb-4">
          <Text className="text-2xl font-bold">Explore</Text>
        </Box>
        <Text className="mb-4">
          This app includes example code to help you get started.
        </Text>

        <Accordion type="single">
          <AccordionItem value="file-routing">
            <AccordionTrigger>
              <Text className="text-lg font-semibold">File-based routing</Text>
            </AccordionTrigger>
            <AccordionContent>
              <Box className="gap-2">
                <Text>
                  This app has two screens:{' '}
                  <Text className="font-semibold">app/(tabs)/index.tsx</Text>{' '}
                  and{' '}
                  <Text className="font-semibold">app/(tabs)/explore.tsx</Text>
                </Text>
                <Text>
                  The layout file in{' '}
                  <Text className="font-semibold">app/(tabs)/_layout.tsx</Text>{' '}
                  sets up the tab navigator.
                </Text>
                <Link
                  href="https://docs.expo.dev/router/introduction"
                  isExternal
                >
                  <Text className="text-primary-500">Learn more</Text>
                </Link>
              </Box>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="platform-support">
            <AccordionTrigger>
              <Text className="text-lg font-semibold">
                Android, iOS, and web support
              </Text>
            </AccordionTrigger>
            <AccordionContent>
              <Text>
                You can open this project on Android, iOS, and the web. To open
                the web version, press <Text className="font-semibold">w</Text>{' '}
                in the terminal running this project.
              </Text>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="custom-fonts">
            <AccordionTrigger>
              <Text className="text-lg font-semibold">Custom fonts</Text>
            </AccordionTrigger>
            <AccordionContent>
              <Box className="gap-2">
                <Text>
                  Open <Text className="font-semibold">app/_layout.tsx</Text> to
                  see how to load{' '}
                  <Text style={{ fontFamily: 'SpaceMono' }}>
                    custom fonts such as this one.
                  </Text>
                </Text>
                <Link
                  href="https://docs.expo.dev/versions/latest/sdk/font"
                  isExternal
                >
                  <Text className="text-primary-500">Learn more</Text>
                </Link>
              </Box>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="theming">
            <AccordionTrigger>
              <Text className="text-lg font-semibold">Light and dark mode</Text>
            </AccordionTrigger>
            <AccordionContent>
              <Box className="gap-2">
                <Text>
                  This template uses Gluestack UI for theming support. You can
                  customize the theme in the Gluestack UI provider
                  configuration.
                </Text>
                <Link
                  href="https://gluestack.io/ui/docs/styling/theme/customizing-theme"
                  isExternal
                >
                  <Text className="text-primary-500">Learn more</Text>
                </Link>
              </Box>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Box>
    </ScrollView>
  );
}
