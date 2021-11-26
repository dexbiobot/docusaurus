/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {processSidebars, SidebarProcessorParams} from '../processor';
import type {
  SidebarItem,
  SidebarItemsGenerator,
  Sidebars,
  NormalizedSidebars,
} from '../types';
import {DefaultSidebarItemsGenerator} from '../generator';
import {createSlugger} from '@docusaurus/utils';
import {VersionMetadata} from '../../types';
import {DefaultNumberPrefixParser} from '../../numberPrefix';

describe('processSidebars', () => {
  function createStaticSidebarItemGenerator(
    sidebarSlice: SidebarItem[],
  ): SidebarItemsGenerator {
    return jest.fn(async () => sidebarSlice);
  }

  const StaticGeneratedSidebarSlice: SidebarItem[] = [
    {type: 'doc', id: 'doc-generated-id-1'},
    {type: 'doc', id: 'doc-generated-id-2'},
  ];

  const StaticSidebarItemsGenerator: SidebarItemsGenerator =
    createStaticSidebarItemGenerator(StaticGeneratedSidebarSlice);

  // @ts-expect-error: good enough for this test
  const version: VersionMetadata = {
    versionName: '1.0.0',
    versionPath: '/docs/1.0.0',
  };

  const params: SidebarProcessorParams = {
    sidebarItemsGenerator: StaticSidebarItemsGenerator,
    docs: [],
    version,
    numberPrefixParser: DefaultNumberPrefixParser,
    categoryLabelSlugger: createSlugger(),
    sidebarOptions: {
      sidebarCollapsed: true,
      sidebarCollapsible: true,
    },
  };

  async function testProcessSidebars(
    unprocessedSidebars: NormalizedSidebars,
    paramsOverrides: Partial<SidebarProcessorParams> = {},
  ) {
    return processSidebars(unprocessedSidebars, {
      ...params,
      ...paramsOverrides,
    });
  }

  test('let sidebars without autogenerated items untouched', async () => {
    const unprocessedSidebars: NormalizedSidebars = {
      someSidebar: [
        {type: 'doc', id: 'doc1'},
        {
          type: 'category',
          collapsed: false,
          collapsible: true,
          items: [{type: 'doc', id: 'doc2'}],
          label: 'Category',
        },
        {type: 'link', href: 'https://facebook.com', label: 'FB'},
      ],
      secondSidebar: [
        {type: 'doc', id: 'doc3'},
        {type: 'link', href: 'https://instagram.com', label: 'IG'},
        {
          type: 'category',
          collapsed: false,
          collapsible: true,
          items: [{type: 'doc', id: 'doc4'}],
          label: 'Category',
        },
      ],
    };

    const processedSidebar = await testProcessSidebars(unprocessedSidebars);
    expect(processedSidebar).toEqual(unprocessedSidebars);
  });

  test('replace autogenerated items by generated sidebars slices', async () => {
    const unprocessedSidebars: NormalizedSidebars = {
      someSidebar: [
        {type: 'doc', id: 'doc1'},
        {
          type: 'category',
          label: 'Category',
          link: {
            type: 'generated-index',
            slug: 'category-generated-index-slug',
            permalink: 'category-generated-index-permalink',
          },
          collapsed: false,
          collapsible: true,
          items: [
            {type: 'doc', id: 'doc2'},
            {type: 'autogenerated', dirName: 'dir1'},
          ],
        },
        {type: 'link', href: 'https://facebook.com', label: 'FB'},
      ],
      secondSidebar: [
        {type: 'doc', id: 'doc3'},
        {type: 'autogenerated', dirName: 'dir2'},
        {type: 'link', href: 'https://instagram.com', label: 'IG'},
        {type: 'autogenerated', dirName: 'dir3'},
        {
          type: 'category',
          label: 'Category',
          collapsed: false,
          collapsible: true,
          items: [{type: 'doc', id: 'doc4'}],
        },
      ],
    };

    const processedSidebar = await testProcessSidebars(unprocessedSidebars);

    expect(StaticSidebarItemsGenerator).toHaveBeenCalledTimes(3);
    expect(StaticSidebarItemsGenerator).toHaveBeenCalledWith({
      defaultSidebarItemsGenerator: DefaultSidebarItemsGenerator,
      item: {type: 'autogenerated', dirName: 'dir1'},
      docs: params.docs,
      version: {
        versionName: version.versionName,
      },
      numberPrefixParser: DefaultNumberPrefixParser,
      options: params.sidebarOptions,
    });
    expect(StaticSidebarItemsGenerator).toHaveBeenCalledWith({
      defaultSidebarItemsGenerator: DefaultSidebarItemsGenerator,
      item: {type: 'autogenerated', dirName: 'dir2'},
      docs: params.docs,
      version: {
        versionName: version.versionName,
      },
      numberPrefixParser: DefaultNumberPrefixParser,
      options: params.sidebarOptions,
    });
    expect(StaticSidebarItemsGenerator).toHaveBeenCalledWith({
      defaultSidebarItemsGenerator: DefaultSidebarItemsGenerator,
      item: {type: 'autogenerated', dirName: 'dir3'},
      docs: params.docs,
      version: {
        versionName: version.versionName,
      },
      numberPrefixParser: DefaultNumberPrefixParser,
      options: params.sidebarOptions,
    });

    expect(processedSidebar).toEqual({
      someSidebar: [
        {type: 'doc', id: 'doc1'},
        {
          type: 'category',
          label: 'Category',
          link: {
            type: 'generated-index',
            slug: 'category-generated-index-slug',
            permalink: 'category-generated-index-permalink',
          },
          collapsed: false,
          collapsible: true,
          items: [{type: 'doc', id: 'doc2'}, ...StaticGeneratedSidebarSlice],
        },
        {type: 'link', href: 'https://facebook.com', label: 'FB'},
      ],
      secondSidebar: [
        {type: 'doc', id: 'doc3'},
        ...StaticGeneratedSidebarSlice,
        {type: 'link', href: 'https://instagram.com', label: 'IG'},
        ...StaticGeneratedSidebarSlice,
        {
          type: 'category',
          label: 'Category',
          collapsed: false,
          collapsible: true,
          items: [{type: 'doc', id: 'doc4'}],
        },
      ],
    } as Sidebars);
  });

  test('ensure generated items are normalized', async () => {
    const sidebarSliceContainingCategoryGeneratedIndex: SidebarItem[] = [
      {
        type: 'category',
        label: 'Generated category',
        link: {
          type: 'generated-index',
          slug: 'generated-cat-index-slug',
          // @ts-expect-error: TODO undefined should be allowed here, typing error needing refactor
          permalink: undefined,
        },
      },
    ];

    const unprocessedSidebars: NormalizedSidebars = {
      someSidebar: [{type: 'autogenerated', dirName: 'dir2'}],
    };

    const processedSidebar = await testProcessSidebars(unprocessedSidebars, {
      sidebarItemsGenerator: createStaticSidebarItemGenerator(
        sidebarSliceContainingCategoryGeneratedIndex,
      ),
    });

    expect(processedSidebar).toEqual({
      someSidebar: [
        {
          type: 'category',
          label: 'Generated category',
          link: {
            type: 'generated-index',
            slug: 'generated-cat-index-slug',
            permalink: '/docs/1.0.0/generated-cat-index-slug',
          },
          items: [],
          collapsible: true,
          collapsed: true,
        },
      ],
    } as Sidebars);
  });
});
