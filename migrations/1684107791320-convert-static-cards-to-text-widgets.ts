import { Dashboard } from '@models';
import { logger } from '@lib/logger';
import { startDatabaseForMigration } from '../src/utils/migrations/database.helper';
import { isNil } from 'lodash';

/** Removes static cards from DB, creates new text widgets instead */
export const up = async () => {
  await startDatabaseForMigration();

  const allDashboards = await Dashboard.find({});
  for (const dashboard of allDashboards) {
    if (!dashboard.structure || !Array.isArray(dashboard.structure)) continue;
    const widgetsToRemove: number[] = [];
    const widgetsToChange: { id: number; settings: any }[] = [];
    for (const widget of dashboard.structure) {
      if (widget.component !== 'summaryCard') continue;
      if (isNil(widget.settings.isDynamic)) continue;
      if (widget.settings.isDynamic === true) {
        logger.info(
          `Updating dynamic summary card widget settings: Dashboard ${dashboard.name} - Widget ID: ${widget.id}`
        );
        const settings = widget.settings;
        const [card] = settings.cards;
        const newSettings = {
          id: settings.id,
          title: settings.title,
          card: {
            title: card?.title || '',
            resource: card?.resource || null,
            layout: card?.layout || null,
            aggregation: card?.aggregation || null,
            height: card?.height || 2,
            width: card?.width || 2,
            html: card?.html || '',
            showDataSourceLink: card?.showDataSourceLink || false,
            useStyles: card?.useStyles || true,
            wholeCardStyles: card?.wholeCardStyles || false,
          },
        };

        widgetsToChange.push({ id: widget.id, settings: newSettings });
        continue;
      }

      // From this point, we are sure that we are dealing with static cards
      widgetsToRemove.push(widget.id);
      logger.info(
        `Converting static summary card widget to text widget: Dashboard ${dashboard.name} - Widget ID: ${widget.id}`
      );

      const cards = widget.settings.cards || [];
      cards.forEach((card) => {
        const nextID = dashboard.structure.length
          ? dashboard.structure[dashboard.structure.length - 1].id + 1
          : 0;

        const newEditorWidget = {
          id: nextID,
          component: 'editor',
          name: 'Text',
          icon: '/assets/text.svg',
          color: '#2F383E',
          defaultCols: 2,
          defaultRows: 2,
          minRow: 1,
          settings: {
            id: nextID,
            text: card.html,
            title: card.title,
            resource: card.resource,
            layout: card.layout,
            record: card.record,
          },
        };
        dashboard.structure.push(newEditorWidget);
      });
    }

    dashboard.structure = dashboard.structure.map((widget) => {
      const shouldUpdate = widgetsToChange.find((w) => w.id === widget.id);
      if (shouldUpdate)
        return {
          ...widget,
          settings: shouldUpdate.settings,
        };
      return widget;
    });

    dashboard.structure = dashboard.structure.filter(
      (widget) => !widgetsToRemove.includes(widget.id)
    );

    await dashboard.save();
  }
};

/**
 * Sample function of down migration
 *
 * @returns just migrate data.
 */
export const down = async () => {
  /*
      Code you downgrade script here!
   */
};
