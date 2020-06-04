// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

//TODO: Remove Path module
import Path from 'path';

import { DialogFooter } from 'office-ui-fabric-react/lib/Dialog';
import formatMessage from 'format-message';
import { PrimaryButton, DefaultButton } from 'office-ui-fabric-react/lib/Button';
import { Stack, StackItem } from 'office-ui-fabric-react/lib/Stack';
import React, { Fragment, useEffect, useCallback } from 'react';
import { TextField } from 'office-ui-fabric-react/lib/TextField';
import { RouteComponentProps } from '@reach/router';
import querystring from 'query-string';

import { DialogCreationCopy, nameRegex } from '../../../constants';
import { DialogWrapper } from '../../DialogWrapper';
import { DialogTypes } from '../../DialogWrapper/styles';
import { LocationSelectContent } from '../LocationBrowser/LocationSelectContent';
import { StorageFolder } from '../../../store/types';
import { FieldConfig, useForm } from '../../../hooks';

import { name, description, halfstack, stackinput } from './styles';
const MAXTRYTIMES = 10000;

interface DefineConversationFormData {
  name: string;
  description: string;
  schemaUrl: string;
}

interface DefineConversationProps
  extends RouteComponentProps<{
    templateId: string;
    location: string;
  }> {
  onSubmit: (formData: DefineConversationFormData) => void;
  onDismiss: () => void;
  onCurrentPathUpdate: (newPath?: string, storageId?: string) => void;
  onGetErrorMessage?: (text: string) => void;
  saveTemplateId?: (templateId: string) => void;
  focusedStorageFolder: StorageFolder;
}

const DefineConversation: React.FC<DefineConversationProps> = (props) => {
  const { onSubmit, onDismiss, onCurrentPathUpdate, saveTemplateId, templateId, focusedStorageFolder } = props;
  const files = focusedStorageFolder.children ?? [];
  const getDefaultName = () => {
    let i = -1;
    const bot = templateId;
    let defaultName = '';
    do {
      i++;
      defaultName = `${bot}-${i}`;
    } while (
      files.some((file) => {
        return file.name.toLowerCase() === defaultName.toLowerCase();
      }) &&
      i < MAXTRYTIMES
    );
    return defaultName;
  };

  const formConfig: FieldConfig<DefineConversationFormData> = {
    name: {
      required: true,
      validate: (value) => {
        if (!value || !nameRegex.test(value)) {
          return formatMessage('Spaces and special characters are not allowed. Use letters, numbers, -, or _.');
        }

        const newBotPath =
          focusedStorageFolder != null && Object.keys(focusedStorageFolder as Record<string, any>).length
            ? Path.join(focusedStorageFolder.parent, focusedStorageFolder.name, value)
            : '';
        if (
          files.some((bot) => {
            return bot.path.toLowerCase() === newBotPath.toLowerCase();
          })
        ) {
          return formatMessage('Duplicate name');
        }
      },
    },
    description: {
      required: false,
    },
    schemaUrl: {
      required: false,
    },
  };
  const { formData, formErrors, hasErrors, updateField, updateForm } = useForm(formConfig);

  useEffect(() => {
    if (templateId) {
      saveTemplateId?.(templateId);
    }
  });

  useEffect(() => {
    const formData: DefineConversationFormData = { name: getDefaultName(), description: '', schemaUrl: '' };
    updateForm(formData);
    if (props.location?.search) {
      const updatedFormData = {
        ...formData,
      };

      const decoded = decodeURIComponent(props.location.search);
      const { name, description, schemaUrl } = querystring.parse(decoded);
      if (description) {
        updatedFormData.description = description as string;
      }

      if (schemaUrl) {
        updatedFormData.schemaUrl = schemaUrl as string;
      }

      if (name) {
        updatedFormData.name = name as string;
      } else {
        updatedFormData.name = getDefaultName();
      }
      updateForm(updatedFormData);
    }
  }, [templateId]);

  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();
      if (hasErrors) {
        return;
      }

      onSubmit({
        ...formData,
      });
    },
    [hasErrors, formData]
  );

  return (
    <Fragment>
      <DialogWrapper
        isOpen
        {...DialogCreationCopy.DEFINE_CONVERSATION_OBJECTIVE}
        dialogType={DialogTypes.CreateFlow}
        onDismiss={onDismiss}
      >
        <form onSubmit={handleSubmit}>
          <input style={{ display: 'none' }} type="submit" />
          <Stack horizontal styles={stackinput} tokens={{ childrenGap: '2rem' }}>
            <StackItem grow={0} styles={halfstack}>
              <TextField
                autoFocus
                required
                data-testid="NewDialogName"
                errorMessage={formErrors.name}
                label={formatMessage('Name')}
                styles={name}
                value={formData.name}
                onChange={(_e, val) => updateField('name', val)}
              />
            </StackItem>
            <StackItem grow={0} styles={halfstack}>
              <TextField
                multiline
                label={formatMessage('Description')}
                resizable={false}
                styles={description}
                value={formData.description}
                onChange={(_e, val) => updateField('description', val)}
              />
            </StackItem>
          </Stack>
          <LocationSelectContent
            focusedStorageFolder={focusedStorageFolder}
            operationMode={{ read: true, write: true }}
            onCurrentPathUpdate={onCurrentPathUpdate}
          />

          <DialogFooter>
            <DefaultButton text={formatMessage('Cancel')} onClick={onDismiss} />
            <PrimaryButton
              data-testid="SubmitNewBotBtn"
              disabled={hasErrors}
              text={formatMessage('Next')}
              onClick={handleSubmit}
            />
          </DialogFooter>
        </form>
      </DialogWrapper>
    </Fragment>
  );
};

export default DefineConversation;
