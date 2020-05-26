// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/** @jsx jsx */
import { jsx } from '@emotion/core';
import { FunctionComponent, useMemo, useContext } from 'react';
import { WidgetContainerProps } from '@bfc/extension';

import { NodeEventTypes } from '../constants/NodeEventTypes';
import { transformSwitchCondition } from '../transformers/transformSwitchCondition';
import { switchCaseLayouter } from '../layouters/switchCaseLayouter';
import { GraphNode } from '../models/GraphNode';
import { OffsetContainer } from '../components/lib/OffsetContainer';
import { StepGroup } from '../components/groups';
import { Diamond } from '../components/nodes/templates/Diamond';
import { ElementMeasurer } from '../components/renderers/ElementMeasurer';
import { SVGContainer } from '../components/lib/SVGContainer';
import { GraphNodeMap, useSmartLayout } from '../hooks/useSmartLayout';
import { designerCache } from '../store/DesignerCache';
import { FlowEdges } from '../components/lib/FlowEdges';
import { FlowRendererContext } from '../store/FlowRendererContext';

enum SwitchNodes {
  Switch = 'switchNode',
  Choice = 'choiceNode',
}

type CaseNodeKey = string;

const getCaseKey = (caseIndex: number): CaseNodeKey => `cases[${caseIndex}]`;
const parseCaseIndex = (caseKey: CaseNodeKey): number => parseInt(caseKey.replace(/cases\[(\d+)\]/, '$1'));

const calculateNodeMap = (path: string, data): GraphNodeMap<SwitchNodes | CaseNodeKey> => {
  const result = transformSwitchCondition(data, path);
  if (!result)
    return {
      [SwitchNodes.Switch]: new GraphNode(),
      [SwitchNodes.Choice]: new GraphNode(),
    };

  const { condition, choice, branches } = result;
  const nodeMap = {
    [SwitchNodes.Switch]: GraphNode.fromIndexedJson(condition),
    [SwitchNodes.Choice]: GraphNode.fromIndexedJson(choice),
  };

  branches.forEach((branch, index) => {
    const key = getCaseKey(index);
    const value = GraphNode.fromIndexedJson(branch);
    nodeMap[key] = value;
  });

  return nodeMap;
};

const calculateLayout = (nodeMap: GraphNodeMap<SwitchNodes | CaseNodeKey>) => {
  const { switchNode, choiceNode, ...cases } = nodeMap as GraphNodeMap<SwitchNodes>;
  const casesNodes = Object.keys(cases)
    .sort((a, b) => parseCaseIndex(a) - parseCaseIndex(b))
    .map(caseName => nodeMap[caseName]);
  return switchCaseLayouter(switchNode, choiceNode, casesNodes);
};

export interface SwitchConditionWidgetProps extends WidgetContainerProps {
  judgement: JSX.Element;
}

export const SwitchConditionWidget: FunctionComponent<SwitchConditionWidgetProps> = ({
  id,
  data,
  onEvent,
  onResize,
  judgement,
}) => {
  const { NodeWrapper } = useContext(FlowRendererContext);
  const nodeMap = useMemo(() => calculateNodeMap(id, data), [id, data]);
  const { layout, updateNodeBoundary } = useSmartLayout<SwitchNodes | CaseNodeKey>(nodeMap, calculateLayout, onResize);

  const { boundary, edges } = layout;
  const { switchNode, choiceNode, ...cases } = nodeMap as GraphNodeMap<SwitchNodes>;
  const casesNodes = Object.keys(cases).map(x => nodeMap[x]);

  return (
    <div css={{ width: boundary.width, height: boundary.height, position: 'relative' }}>
      <SVGContainer width={boundary.width} height={boundary.height}>
        <FlowEdges edges={edges} />
      </SVGContainer>
      <OffsetContainer offset={switchNode.offset}>
        <NodeWrapper nodeId={switchNode.id} nodeData={data} onEvent={onEvent}>
          <ElementMeasurer
            onResize={boundary => {
              designerCache.cacheBoundary(switchNode.data, boundary);
              updateNodeBoundary(SwitchNodes.Switch, boundary);
            }}
          >
            {judgement}
          </ElementMeasurer>
        </NodeWrapper>
      </OffsetContainer>
      <OffsetContainer offset={choiceNode.offset} css={{ zIndex: 100 }}>
        <Diamond
          data-testid="SwitchConditionDiamond"
          onClick={() => {
            onEvent(NodeEventTypes.Focus, { id });
          }}
        />
      </OffsetContainer>
      {(casesNodes as any).map((x, index) => (
        <OffsetContainer key={`${x.id}/offset`} offset={x.offset}>
          <StepGroup
            key={x.id}
            id={x.id}
            data={x.data}
            onEvent={onEvent}
            onResize={size => {
              updateNodeBoundary(getCaseKey(index), size);
            }}
          />
        </OffsetContainer>
      ))}
    </div>
  );
};

SwitchConditionWidget.defaultProps = {
  onResize: () => null,
};
